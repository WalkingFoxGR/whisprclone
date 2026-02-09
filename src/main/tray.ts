import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

export function createTray(mainWindow: BrowserWindow): Tray {
  // Create a simple tray icon (16x16 template image for macOS)
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)

  // Set a title for macOS menu bar
  if (process.platform === 'darwin') {
    tray.setTitle('FC')
  }

  tray.setToolTip('FlowCopy - Voice to Text')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open FlowCopy',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      },
    },
    { type: 'separator' },
    {
      label: 'Recording: Ready',
      enabled: false,
      id: 'recording-status',
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('navigate', '/settings')
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  return tray
}

export function updateTrayRecordingStatus(isRecording: boolean): void {
  if (!tray) return

  if (process.platform === 'darwin') {
    tray.setTitle(isRecording ? '🔴' : 'FC')
  }

  tray.setToolTip(isRecording ? 'FlowCopy - Recording...' : 'FlowCopy - Voice to Text')
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
