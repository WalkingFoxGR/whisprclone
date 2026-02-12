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
    // This call with `true` will prompt the macOS accessibility dialog
    const isTrusted = systemPreferences.isTrustedAccessibilityClient(true)
    if (!isTrusted) {
      // Open System Settings to the Accessibility privacy pane
      // macOS Ventura+ (13+) uses the new System Settings app
      // macOS Monterey and earlier (12-) uses System Preferences
      const macOSVersion = Number(require('os').release().split('.')[0])
      if (macOSVersion >= 22) {
        // macOS Ventura (13) = Darwin 22, Sonoma (14) = Darwin 23, Sequoia (15) = Darwin 24
        shell.openExternal('x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Accessibility')
      } else {
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')
      }
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
    const macOSVersion = Number(require('os').release().split('.')[0])
    const settingsUrl = macOSVersion >= 22
      ? 'x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Microphone'
      : 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'

    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Microphone Access Required',
      message: 'VoxPilot needs microphone access to record your voice.',
      detail: 'Grant microphone access in System Settings > Privacy & Security > Microphone, then restart VoxPilot.',
      buttons: ['Open System Settings', 'Later'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) {
        shell.openExternal(settingsUrl)
      }
    })
  }

  // Check accessibility (needed for global hotkey capture + auto-paste)
  if (!status.accessibility) {
    // This triggers the macOS prompt asking user to grant accessibility
    const isTrusted = systemPreferences.isTrustedAccessibilityClient(true)
    if (!isTrusted) {
      const macOSVersion = Number(require('os').release().split('.')[0])
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Accessibility Access Required',
        message: 'VoxPilot needs Accessibility access for global hotkeys and auto-paste.',
        detail: 'Please enable VoxPilot in System Settings > Privacy & Security > Accessibility, then restart the app.\n\nAlso enable it under Input Monitoring if you want to use the Fn/Globe key.',
        buttons: ['Open System Settings', 'Later'],
        defaultId: 0,
      })
      if (response === 0) {
        const settingsUrl = macOSVersion >= 22
          ? 'x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Accessibility'
          : 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
        shell.openExternal(settingsUrl)
      }
    }
  }
}
