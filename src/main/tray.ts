import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'

let tray: Tray | null = null

function createTrayIcon(): Electron.NativeImage {
  // Create a 16×16 template image for macOS menu bar (simple mic icon)
  const size = 16
  const canvas = Buffer.alloc(size * size * 4, 0)

  // Draw a simple microphone shape (white pixels on transparent)
  const setPixel = (x: number, y: number) => {
    if (x >= 0 && x < size && y >= 0 && y < size) {
      const i = (y * size + x) * 4
      canvas[i] = 255     // R
      canvas[i + 1] = 255 // G
      canvas[i + 2] = 255 // B
      canvas[i + 3] = 255 // A
    }
  }

  // Mic body (rows 2-9, cols 6-9)
  for (let y = 2; y <= 9; y++) {
    for (let x = 6; x <= 9; x++) {
      setPixel(x, y)
    }
  }
  // Mic rounded top (row 1)
  setPixel(7, 1); setPixel(8, 1)
  // Mic cup (row 10-11)
  setPixel(5, 10); setPixel(10, 10)
  setPixel(5, 11); setPixel(10, 11)
  // Bottom curve
  setPixel(6, 12); setPixel(7, 12); setPixel(8, 12); setPixel(9, 12)
  // Stand
  setPixel(7, 13); setPixel(8, 13)
  // Base
  setPixel(6, 14); setPixel(7, 14); setPixel(8, 14); setPixel(9, 14)

  const icon = nativeImage.createFromBuffer(canvas, { width: size, height: size })
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true)
  }
  return icon
}

export function createTray(mainWindow: BrowserWindow): Tray {
  const icon = createTrayIcon()
  tray = new Tray(icon)

  if (process.platform === 'darwin') {
    tray.setTitle('VP')
  }

  tray.setToolTip('VoxPilot - Voice to Text')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open VoxPilot',
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
    tray.setTitle(isRecording ? '🔴' : 'VP')
  }

  tray.setToolTip(isRecording ? 'VoxPilot - Recording...' : 'VoxPilot - Voice to Text')
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
