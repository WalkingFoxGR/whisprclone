import { BrowserWindow, ipcMain, app } from 'electron'
import { registerSettingsHandlers } from './settings.ipc'
import { registerDictionaryHandlers } from './dictionary.ipc'
import { registerSnippetsHandlers } from './snippets.ipc'
import { registerTranscriptionHandlers } from './transcription.ipc'
import { registerUsageHandlers } from './usage.ipc'
import { registerToneHandlers } from './tone.ipc'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { checkPermissions, requestMicrophonePermission, requestAccessibilityPermission } from '../permissions'

export function registerAllHandlers(mainWindow: () => BrowserWindow | null): void {
  registerSettingsHandlers()
  registerDictionaryHandlers()
  registerSnippetsHandlers()
  registerTranscriptionHandlers(mainWindow)
  registerUsageHandlers()
  registerToneHandlers()

  // App-level handlers
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => {
    return app.getVersion()
  })

  ipcMain.handle(IPC_CHANNELS.APP_CHECK_PERMISSIONS, async () => {
    return checkPermissions()
  })

  ipcMain.handle(IPC_CHANNELS.APP_REQUEST_PERMISSION, async (_event, type: 'microphone' | 'accessibility') => {
    if (type === 'microphone') {
      return requestMicrophonePermission()
    }
    if (type === 'accessibility') {
      return requestAccessibilityPermission()
    }
    return false
  })
}
