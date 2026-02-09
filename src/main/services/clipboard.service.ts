import { clipboard } from 'electron'

let savedClipboardText: string | null = null

export function saveClipboard(): void {
  try {
    savedClipboardText = clipboard.readText()
  } catch {
    savedClipboardText = null
  }
}

export function writeAndPaste(text: string): void {
  // Save current clipboard
  saveClipboard()

  // Write polished text to clipboard
  clipboard.writeText(text)

  // Simulate Cmd+V (macOS) or Ctrl+V (Windows/Linux)
  simulatePaste()

  // Restore original clipboard after a delay
  setTimeout(restoreClipboard, 500)
}

function simulatePaste(): void {
  // Use AppleScript on macOS for reliable paste simulation
  // This avoids the need for @nut-tree/nut-js and Accessibility permissions for basic paste
  if (process.platform === 'darwin') {
    const { exec } = require('child_process')
    exec(
      `osascript -e 'tell application "System Events" to keystroke "v" using command down'`,
      (err: Error | null) => {
        if (err) {
          console.error('Failed to simulate paste:', err)
        }
      }
    )
  } else if (process.platform === 'win32') {
    const { exec } = require('child_process')
    exec(
      `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"`,
      (err: Error | null) => {
        if (err) {
          console.error('Failed to simulate paste:', err)
        }
      }
    )
  }
}

function restoreClipboard(): void {
  if (savedClipboardText !== null) {
    try {
      clipboard.writeText(savedClipboardText)
    } catch {
      // Ignore clipboard restore errors
    }
    savedClipboardText = null
  }
}
