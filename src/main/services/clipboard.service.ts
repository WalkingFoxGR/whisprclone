import { clipboard } from 'electron'
import { uIOhook, UiohookKey } from 'uiohook-napi'

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
  // Use uiohook-napi to simulate the paste keystroke.
  // This works through the same Input Monitoring permission that the hotkey
  // listener already uses, so it survives reboots without needing a separate
  // Accessibility grant for osascript/System Events.
  try {
    if (process.platform === 'darwin') {
      uIOhook.keyTap(UiohookKey.V, [UiohookKey.Meta])
    } else {
      uIOhook.keyTap(UiohookKey.V, [UiohookKey.Ctrl])
    }
  } catch (err) {
    console.error('Failed to simulate paste via uiohook, falling back to osascript:', err)
    // Fallback to osascript if uiohook fails
    if (process.platform === 'darwin') {
      const { exec } = require('child_process')
      exec(
        `osascript -e 'tell application "System Events" to keystroke "v" using command down'`,
        (execErr: Error | null) => {
          if (execErr) {
            console.error('Fallback paste also failed:', execErr)
          }
        }
      )
    }
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
