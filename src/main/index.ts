import { app, BrowserWindow, ipcMain } from 'electron'
import { createMainWindow, createRecorderWindow, createOverlayWindow, setQuitting } from './windows'
import { createTray, updateTrayRecordingStatus, destroyTray } from './tray'
import { registerAllHandlers } from './ipc'
import { registerHotkey, registerHotkeyRaw, unregisterAll, getRecordingState, startCapture, stopCapture, hotkeyToDisplayString } from './services/hotkey.service'
import { getDatabase, closeDatabase } from './db/database'
import { SettingsRepository } from './db/repositories/settings.repo'
import { SnippetsRepository } from './db/repositories/snippets.repo'
import { UsageRepository } from './db/repositories/usage.repo'
import { transcribe, polish, estimateCost, shouldSkipPolish, quickCleanup } from './services/openai.service'
import { writeAndPaste } from './services/clipboard.service'
import { getToneForActiveApp } from './services/tone.service'
import { ensurePermissionsOnStartup } from './permissions'
import { initUpdater, checkForUpdates, downloadUpdate, quitAndInstall } from './services/updater.service'
import { IPC_CHANNELS } from '../shared/ipc-channels'

let mainWindow: BrowserWindow | null = null
let recorderWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let isRecordingFromUI = false

function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

// Helper: broadcast recording state to both main UI and overlay
function broadcastRecordingState(state: string, extra?: Record<string, any>): void {
  const payload = { state, ...extra }
  mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATUS, payload)
  overlayWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATUS, payload)
}

app.whenReady().then(async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.voxpilot.app')
  }

  // Initialize database
  getDatabase()

  // Register IPC handlers
  registerAllHandlers(getMainWindow)

  // Create windows
  mainWindow = createMainWindow()
  recorderWindow = createRecorderWindow()
  overlayWindow = createOverlayWindow()

  // Create system tray
  createTray(mainWindow)

  // Check and request permissions on startup (macOS mic + accessibility)
  await ensurePermissionsOnStartup(mainWindow)

  // Initialize auto-updater
  initUpdater(mainWindow)

  // IPC: auto-update handlers
  ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK, () => checkForUpdates())
  ipcMain.handle(IPC_CHANNELS.UPDATE_DOWNLOAD, () => downloadUpdate())
  ipcMain.handle(IPC_CHANNELS.UPDATE_INSTALL, () => quitAndInstall())

  // Check for updates 5 seconds after startup (non-blocking)
  setTimeout(() => checkForUpdates(), 5000)

  // Register global hotkey for recording — try raw keycode first, then legacy accelerator
  const _onRecStart = () => {
    updateTrayRecordingStatus(true)
    overlayWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATUS, { state: 'recording' })
  }
  const _onRecStop = () => {
    updateTrayRecordingStatus(false)
    overlayWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATUS, { state: 'transcribing' })
  }

  try {
    const db = getDatabase()
    const startupSettings = new SettingsRepository(db)
    const rawHotkey = startupSettings.get('hotkey_raw')
    if (rawHotkey) {
      const { keycode, mods } = JSON.parse(rawHotkey)
      registerHotkeyRaw(keycode, mods, mainWindow, recorderWindow, _onRecStart, _onRecStop)
      // Refresh display name in case it was saved by an older version (e.g. "Key(0)" → "🌐")
      const freshDisplay = hotkeyToDisplayString(keycode, mods)
      startupSettings.set('hotkey_display', freshDisplay)
    } else {
      registerHotkey(mainWindow, recorderWindow, _onRecStart, _onRecStop)
    }
  } catch {
    registerHotkey(mainWindow, recorderWindow, _onRecStart, _onRecStop)
  }

  // Launch at login setting
  try {
    const db = getDatabase()
    const settings = new SettingsRepository(db)
    const launchAtLogin = settings.get('launch_at_login') === 'true'
    app.setLoginItemSettings({ openAtLogin: launchAtLogin })
  } catch {
    // Ignore if settings not available yet
  }

  // IPC: renderer can start/stop recording via the UI record button
  ipcMain.handle(IPC_CHANNELS.RECORDING_START, () => {
    if (!isRecordingFromUI && recorderWindow) {
      isRecordingFromUI = true
      recorderWindow.webContents.send(IPC_CHANNELS.RECORDING_START)
      broadcastRecordingState('recording', { duration_ms: 0 })
      updateTrayRecordingStatus(true)
    }
  })

  ipcMain.handle(IPC_CHANNELS.RECORDING_STOP, () => {
    if (isRecordingFromUI && recorderWindow) {
      isRecordingFromUI = false
      recorderWindow.webContents.send(IPC_CHANNELS.RECORDING_STOP)
      broadcastRecordingState('transcribing')
      updateTrayRecordingStatus(false)
    }
  })

  // Helper: recording start/stop callbacks for hotkey
  const hotkeyOnStart = () => {
    updateTrayRecordingStatus(true)
    overlayWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATUS, { state: 'recording' })
  }
  const hotkeyOnStop = () => {
    updateTrayRecordingStatus(false)
    overlayWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATUS, { state: 'transcribing' })
  }

  // IPC: re-register hotkey when user changes the shortcut in settings
  ipcMain.on('hotkey:re-register', () => {
    // Check if we have raw keycode data (new format)
    try {
      const db = getDatabase()
      const settingsRepo = new SettingsRepository(db)
      const rawHotkey = settingsRepo.get('hotkey_raw')
      if (rawHotkey) {
        const { keycode, mods } = JSON.parse(rawHotkey)
        registerHotkeyRaw(keycode, mods, mainWindow, recorderWindow, hotkeyOnStart, hotkeyOnStop)
        return
      }
    } catch { /* fall through to legacy */ }

    registerHotkey(mainWindow, recorderWindow, hotkeyOnStart, hotkeyOnStop)
  })

  // IPC: Capture next keypress for hotkey configuration (uses uiohook, supports ALL keys)
  ipcMain.handle(IPC_CHANNELS.HOTKEY_CAPTURE_START, async () => {
    const result = await startCapture()
    // Save the raw keycode + mods
    const db = getDatabase()
    const settingsRepo = new SettingsRepository(db)
    settingsRepo.set('hotkey_raw', JSON.stringify({ keycode: result.keycode, mods: result.mods }))
    settingsRepo.set('hotkey_display', result.displayName)
    // Re-register with raw keycode
    registerHotkeyRaw(result.keycode, result.mods, mainWindow, recorderWindow, hotkeyOnStart, hotkeyOnStop)
    return result
  })

  ipcMain.handle(IPC_CHANNELS.HOTKEY_CAPTURE_STOP, () => {
    stopCapture()
  })

  // Overlay click-through: re-enable mouse events when hovering the bar
  ipcMain.on('overlay:mouse-enter', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.setIgnoreMouseEvents(false)
    }
  })
  ipcMain.on('overlay:mouse-leave', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.setIgnoreMouseEvents(true, { forward: true })
    }
  })

  // Forward audio frequency bins from recorder → overlay + main UI for waveform
  ipcMain.on(IPC_CHANNELS.RECORDING_AUDIO_BINS, (_event, bins: number[]) => {
    try {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send(IPC_CHANNELS.RECORDING_AUDIO_BINS, bins)
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.RECORDING_AUDIO_BINS, bins)
      }
    } catch {
      // Window may be destroyed during cleanup
    }
  })

  // Also forward audio level
  ipcMain.on(IPC_CHANNELS.RECORDING_AUDIO_LEVEL, (_event, level: number) => {
    try {
      overlayWindow?.webContents.send(IPC_CHANNELS.RECORDING_AUDIO_LEVEL, level)
      mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_AUDIO_LEVEL, level)
    } catch {
      // Window may be destroyed
    }
  })

  // Handle complete recording from hidden recorder window
  ipcMain.on('recording:complete', async (_event, audioData: ArrayBuffer) => {
    isRecordingFromUI = false

    broadcastRecordingState('transcribing')

    try {
      // Ensure we have a proper Buffer from the IPC data
      let audioBuffer: Buffer
      if (Buffer.isBuffer(audioData)) {
        audioBuffer = audioData
      } else if (audioData instanceof ArrayBuffer) {
        audioBuffer = Buffer.from(audioData)
      } else {
        audioBuffer = Buffer.from(audioData as any)
      }

      console.log(`[recording:complete] Audio buffer size: ${audioBuffer.length} bytes`)

      if (audioBuffer.length === 0) {
        console.error('[recording:complete] Empty audio buffer received')
        broadcastRecordingState('idle')
        return
      }

      const { text: rawText, language } = await transcribe(audioBuffer)
      console.log(`[recording:complete] RAW TRANSCRIPTION: "${rawText}"`)
      console.log(`[recording:complete] Detected language: ${language}`)

      if (!rawText || rawText.trim().length === 0) {
        broadcastRecordingState('idle')
        return
      }

      // Polishing step
      const { tone, customInstructions, appName } = await getToneForActiveApp()

      // Check snippets
      const db = getDatabase()
      const snippetsRepo = new SnippetsRepository(db)
      const matchedSnippet = snippetsRepo.findMatchingSnippet(rawText)

      let textToPolish = rawText
      if (matchedSnippet) {
        textToPolish = rawText.replace(
          new RegExp(matchedSnippet.trigger_phrase, 'gi'),
          matchedSnippet.expansion
        )
        snippetsRepo.incrementUseCount(matchedSnippet.id)
      }

      // Smart polish skip: if text is already clean & short, skip the GPT call to save cost
      const settings = new SettingsRepository(db)
      const smartSkipEnabled = settings.get('smart_polish_skip') !== 'false'

      let polishedText: string
      let polishSkipped = false
      if (smartSkipEnabled && shouldSkipPolish(textToPolish)) {
        polishedText = quickCleanup(textToPolish)
        polishSkipped = true
        console.log(`[recording:complete] Polish SKIPPED (clean text): "${polishedText}"`)
      } else {
        broadcastRecordingState('polishing')
        polishedText = await polish(textToPolish, tone, customInstructions)
        console.log(`[recording:complete] POLISHED: "${polishedText.substring(0, 100)}"`)
      }

      const wordCount = polishedText.split(/\s+/).filter(Boolean).length
      const rawWordCount = rawText.split(/\s+/).filter(Boolean).length

      // Auto-paste if enabled
      const autoPaste = settings.get('auto_paste') !== 'false'

      if (autoPaste) {
        broadcastRecordingState('pasting')
        writeAndPaste(polishedText)
      }

      // Calculate API cost
      const transcriptionModel = settings.get('transcription_provider') === 'groq'
        ? (settings.get('openai_model_transcription') || 'whisper-large-v3-turbo')
        : (settings.get('openai_model_transcription') || 'gpt-4o-transcribe')
      const polishModel = settings.get('openai_model_polish') || 'gpt-5.1'
      const costCents = estimateCost({
        transcriptionModel,
        polishModel: polishSkipped ? 'none' : polishModel, // 'none' = 0 cost when skipped
        recordingDurationMs: 0,
        inputWordCount: rawWordCount,
        outputWordCount: wordCount,
      })

      // Log usage
      const usageRepo = new UsageRepository(db)
      usageRepo.log({
        raw_text: rawText,
        polished_text: polishedText,
        word_count: wordCount,
        recording_duration_ms: 0,
        target_app: appName,
        language_detected: language ?? undefined,
        tone_used: tone,
        snippet_used: matchedSnippet?.trigger_phrase,
        estimated_cost_cents: costCents,
        transcription_model: transcriptionModel,
        polish_model: polishSkipped ? 'skipped' : polishModel,
      })

      broadcastRecordingState('idle', {
        result: { raw_text: rawText, polished_text: polishedText, word_count: wordCount },
      })
    } catch (error: any) {
      console.error('[recording:complete] Error:', error?.message || error)
      console.error('[recording:complete] Stack:', error?.stack)
      const errorMsg = error?.message || 'Processing failed'
      broadcastRecordingState('error', { error: errorMsg })
      // Reset to idle after showing error briefly
      setTimeout(() => broadcastRecordingState('idle'), 5000)
    }
  })

  // Before quit: allow windows to actually close
  app.on('before-quit', () => {
    setQuitting(true)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  unregisterAll()
  destroyTray()
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.destroy()
  }
  closeDatabase()
})
