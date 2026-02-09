import { systemPreferences, dialog, shell, BrowserWindow } from 'electron'
import type { PermissionStatus } from '../shared/types'

export async function checkPermissions(): Promise<PermissionStatus> {
  const result: PermissionStatus = {
    microphone: 'not-determined',
    accessibility: false,
  }

  if (process.platform === 'darwin') {
    const micStatus = systemPreferences.getMediaAccessStatus('microphone')
    result.microphone = micStatus === 'granted' ? 'granted' : micStatus === 'denied' ? 'denied' : 'not-determined'
    result.accessibility = systemPreferences.isTrustedAccessibilityClient(false)
  } else {
    result.microphone = 'granted'
    result.accessibility = true
  }

  return result
}

export async function requestMicrophonePermission(): Promise<boolean> {
  if (process.platform === 'darwin') {
    const granted = await systemPreferences.askForMediaAccess('microphone')
    return granted
  }
  return true
}

export function requestAccessibilityPermission(): boolean {
  if (process.platform === 'darwin') {
    const isTrusted = systemPreferences.isTrustedAccessibilityClient(true)
    if (!isTrusted) {
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')
    }
    return isTrusted
  }
  return true
}

export async function ensurePermissionsOnStartup(mainWindow: BrowserWindow): Promise<void> {
  if (process.platform !== 'darwin') return

  const status = await checkPermissions()

  // Auto-request microphone on first run
  if (status.microphone === 'not-determined') {
    await requestMicrophonePermission()
  }

  // If mic was denied, show dialog to fix it
  if (status.microphone === 'denied') {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Microphone Access Required',
      message: 'FlowCopy needs microphone access to record your voice.',
      detail: 'Grant microphone access in System Settings > Privacy & Security > Microphone, then restart FlowCopy.',
      buttons: ['Open System Settings', 'Later'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) {
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone')
      }
    })
  }

  // Check accessibility (needed for auto-paste via keyboard simulation)
  if (!status.accessibility) {
    systemPreferences.isTrustedAccessibilityClient(true)
  }
}
