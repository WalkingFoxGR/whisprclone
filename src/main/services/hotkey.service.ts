import { globalShortcut, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { getDatabase } from '../db/database'
import { SettingsRepository } from '../db/repositories/settings.repo'

let currentHotkey: string | null = null
let isRecording = false
let recordingStartTime: number | null = null

export function getRecordingState() {
  return {
    isRecording,
    startTime: recordingStartTime,
    duration: recordingStartTime ? Date.now() - recordingStartTime : 0,
  }
}

export function registerHotkey(
  mainWindow: BrowserWindow | null,
  recorderWindow: BrowserWindow | null,
  onRecordingStart: () => void,
  onRecordingStop: () => void
): void {
  const db = getDatabase()
  const settings = new SettingsRepository(db)
  const hotkey = settings.get('hotkey') || 'CommandOrControl+Shift+Space'
  const mode = settings.get('recording_mode') || 'push_to_talk'

  // Unregister previous hotkey
  if (currentHotkey) {
    globalShortcut.unregister(currentHotkey)
  }

  if (mode === 'toggle') {
    // Toggle mode: press to start, press again to stop
    const success = globalShortcut.register(hotkey, () => {
      if (isRecording) {
        stopRecording(mainWindow, recorderWindow, onRecordingStop)
      } else {
        startRecording(mainWindow, recorderWindow, onRecordingStart)
      }
    })

    if (!success) {
      console.error(`Failed to register hotkey: ${hotkey}`)
    }
  } else {
    // Push-to-talk mode: hold to record, release to stop
    // Note: Electron's globalShortcut doesn't support key-up events directly.
    // We use toggle mode as a workaround - press to start, press again to stop.
    // For true push-to-talk, we'd need a native module.
    const success = globalShortcut.register(hotkey, () => {
      if (isRecording) {
        stopRecording(mainWindow, recorderWindow, onRecordingStop)
      } else {
        startRecording(mainWindow, recorderWindow, onRecordingStart)
      }
    })

    if (!success) {
      console.error(`Failed to register hotkey: ${hotkey}`)
    }
  }

  currentHotkey = hotkey
}

function startRecording(
  mainWindow: BrowserWindow | null,
  recorderWindow: BrowserWindow | null,
  onRecordingStart: () => void
): void {
  if (isRecording) return

  isRecording = true
  recordingStartTime = Date.now()

  // Tell hidden recorder window to start capturing audio
  recorderWindow?.webContents.send(IPC_CHANNELS.RECORDING_START)

  // Notify main renderer of state change
  mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATUS, {
    state: 'recording',
    duration_ms: 0,
  })

  onRecordingStart()
}

function stopRecording(
  mainWindow: BrowserWindow | null,
  recorderWindow: BrowserWindow | null,
  onRecordingStop: () => void
): void {
  if (!isRecording) return

  isRecording = false
  const duration = recordingStartTime ? Date.now() - recordingStartTime : 0
  recordingStartTime = null

  // Tell hidden recorder window to stop and send audio
  recorderWindow?.webContents.send(IPC_CHANNELS.RECORDING_STOP)

  // Notify main renderer
  mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATUS, {
    state: 'transcribing',
    duration_ms: duration,
  })

  onRecordingStop()
}

export function unregisterHotkey(): void {
  if (currentHotkey) {
    globalShortcut.unregister(currentHotkey)
    currentHotkey = null
  }
}

export function unregisterAll(): void {
  globalShortcut.unregisterAll()
  currentHotkey = null
}
