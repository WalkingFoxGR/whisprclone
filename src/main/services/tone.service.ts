import { exec } from 'child_process'
import { getDatabase } from '../db/database'
import { ToneProfilesRepository } from '../db/repositories/tone-profiles.repo'
import type { ToneProfile } from '../../shared/types'

export async function getActiveAppIdentifier(): Promise<{ identifier: string; name: string }> {
  if (process.platform === 'darwin') {
    return new Promise((resolve) => {
      exec(
        `osascript -e 'tell application "System Events"
          set frontApp to first process whose frontmost is true
          set appId to bundle identifier of frontApp
          set appName to name of frontApp
          return appId & "|" & appName
        end tell'`,
        (err, stdout) => {
          if (err) {
            resolve({ identifier: 'unknown', name: 'Unknown' })
            return
          }
          const parts = stdout.trim().split('|')
          resolve({
            identifier: parts[0] || 'unknown',
            name: parts[1] || 'Unknown',
          })
        }
      )
    })
  }

  if (process.platform === 'win32') {
    return new Promise((resolve) => {
      exec(
        `powershell -command "(Get-Process | Where-Object {$_.MainWindowHandle -ne 0} | Sort-Object -Property @{Expression={$_.MainWindowHandle -eq [System.Diagnostics.Process]::GetCurrentProcess().MainWindowHandle}} -Descending | Select-Object -First 1).ProcessName"`,
        (err, stdout) => {
          const name = err ? 'Unknown' : stdout.trim()
          resolve({ identifier: name.toLowerCase(), name })
        }
      )
    })
  }

  return { identifier: 'unknown', name: 'Unknown' }
}

export async function getToneForActiveApp(): Promise<{
  tone: string
  customInstructions?: string
  appName: string
}> {
  const { identifier, name } = await getActiveAppIdentifier()

  const db = getDatabase()
  const toneRepo = new ToneProfilesRepository(db)
  const profile = toneRepo.getByAppIdentifier(identifier)

  if (profile) {
    return {
      tone: profile.tone,
      customInstructions: profile.custom_instructions || undefined,
      appName: name,
    }
  }

  return { tone: 'neutral', appName: name }
}
