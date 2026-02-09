import { app, BrowserWindow, ipcMain } from 'electron'
import { createMainWindow, createRecorderWindow } from './windows'
import { createTray, updateTrayRecordingStatus, destroyTray } from './tray'
import { registerAllHandlers } from './ipc'
import { registerHotkey, unregisterAll } from './services/hotkey.service'
import { getDatabase, closeDatabase } from './db/database'
import { IPC_CHANNELS } from '../shared/ipc-channels'

let mainWindow: BrowserWindow | null = null
let recorderWindow: BrowserWindow | null = null

function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

app.whenReady().then(() => {
  // Set app user model id for Windows
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.flowcopy.app')
  }

  // Initialize database
  getDatabase()

  // Register IPC handlers
  registerAllHandlers(getMainWindow)

  // Create windows
  mainWindow = createMainWindow()
  recorderWindow = createRecorderWindow()

  // Create system tray
  createTray(mainWindow)

  // Register global hotkey for recording
  registerHotkey(
    mainWindow,
    recorderWindow,
    () => updateTrayRecordingStatus(true),
    () => updateTrayRecordingStatus(false)
  )

  // Handle audio data from recorder window -> transcription pipeline
  ipcMain.on(IPC_CHANNELS.RECORDING_AUDIO_DATA, async (_event, audioData: ArrayBuffer) => {
    // Forward to transcription handler
    if (mainWindow) {
      try {
        const result = await mainWindow.webContents.executeJavaScript('true') // ensure window is alive
        if (result) {
          ipcMain.emit(IPC_CHANNELS.TRANSCRIBE_AUDIO, _event, audioData)
        }
      } catch {
        // Window not ready
      }
    }
  })

  // Handle complete recording from recorder window
  ipcMain.on('recording:complete', async (_event, audioData: ArrayBuffer) => {
    if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.RECORDING_STATUS, { state: 'transcribing' })
    }

    // Trigger the transcription pipeline
    try {
      const { transcribe } = await import('./services/openai.service')
      const { polish } = await import('./services/openai.service')
      const { writeAndPaste } = await import('./services/clipboard.service')
      const { getToneForActiveApp } = await import('./services/tone.service')

      const audioBuffer = Buffer.from(audioData)
      const { text: rawText, language } = await transcribe(audioBuffer)

      if (!rawText || rawText.trim().length === 0) {
        mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATUS, { state: 'idle' })
        return
      }

      // Get tone
      mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATUS, { state: 'polishing' })
      const { tone, customInstructions, appName } = await getToneForActiveApp()

      // Check snippets
      const db = getDatabase()
      const { SnippetsRepository } = await import('./db/repositories/snippets.repo')
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

      const polishedText = await polish(textToPolish, tone, customInstructions)
      const wordCount = polishedText.split(/\s+/).filter(Boolean).length

      // Paste
      const { SettingsRepository } = await import('./db/repositories/settings.repo')
      const settings = new SettingsRepository(db)
      const autoPaste = settings.get('auto_paste') !== 'false'

      if (autoPaste) {
        mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATUS, { state: 'pasting' })
        writeAndPaste(polishedText)
      }

      // Log usage
      const { UsageRepository } = await import('./db/repositories/usage.repo')
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
      })

      mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATUS, {
        state: 'idle',
        result: { raw_text: rawText, polished_text: polishedText, word_count: wordCount },
      })
    } catch (error: any) {
      mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATUS, {
        state: 'error',
        error: error.message || 'Processing failed',
      })
    }
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
  // On macOS, keep the app running in the tray
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  unregisterAll()
  destroyTray()
  closeDatabase()
})
