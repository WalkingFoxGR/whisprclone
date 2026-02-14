import { BrowserWindow, shell, app } from 'electron'
import { join } from 'path'

const isDev = !app.isPackaged
let isQuitting = false

export function setQuitting(val: boolean): void {
  isQuitting = val
}

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Close-to-hide: clicking the red X hides the window instead of destroying it
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

export function createRecorderWindow(): BrowserWindow {
  const recorderWindow = new BrowserWindow({
    show: false,
    width: 1,
    height: 1,
    webPreferences: {
      preload: join(__dirname, '../preload/recorder.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    recorderWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/recorder.html`)
  } else {
    recorderWindow.loadFile(join(__dirname, '../renderer/recorder.html'))
  }

  return recorderWindow
}

export function createOverlayWindow(): BrowserWindow {
  const overlay = new BrowserWindow({
    width: 220,
    height: 60,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    focusable: false,
    roundedCorners: false,
    ...(process.platform === 'darwin' ? { type: 'panel' } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlay.setAlwaysOnTop(true, 'screen-saver')

  // Make the transparent area click-through so the overlay doesn't block
  // clicks on elements underneath. The renderer uses CSS pointer-events
  // and IPC to re-enable mouse events only when hovering the actual bar.
  overlay.setIgnoreMouseEvents(true, { forward: true })

  // Position: bottom-center of screen
  const { screen } = require('electron')
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize
  const overlayWidth = 220
  overlay.setPosition(Math.round((width - overlayWidth) / 2), height - 80)

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    overlay.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay.html`)
  } else {
    overlay.loadFile(join(__dirname, '../renderer/overlay.html'))
  }

  return overlay
}
