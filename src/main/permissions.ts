import { systemPreferences } from 'electron'
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
    // On Windows, microphone permission is handled by getUserMedia
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
    // Passing true prompts the user
    return systemPreferences.isTrustedAccessibilityClient(true)
  }
  return true
}
