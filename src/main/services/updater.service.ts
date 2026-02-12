/**
 * Auto-update service — checks GitHub Releases for new versions and downloads/installs them.
 * Uses electron-updater with the "github" provider.
 */

import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

let mainWindow_: BrowserWindow | null = null

/**
 * Initialize the auto-updater. Call once on app startup.
 */
export function initUpdater(mainWindow: BrowserWindow): void {
  mainWindow_ = mainWindow

  // Don't auto-download — let the user decide
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // For unsigned apps (no code signing), allow updates anyway
  autoUpdater.allowDowngrade = false

  // Logger
  autoUpdater.logger = {
    info: (msg: string) => console.log('[updater]', msg),
    warn: (msg: string) => console.warn('[updater]', msg),
    error: (msg: string) => console.error('[updater]', msg),
    debug: (msg: string) => console.log('[updater:debug]', msg),
  } as any

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] Checking for updates...')
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log(`[updater] Update available: ${info.version}`)
    sendToRenderer(IPC_CHANNELS.UPDATE_AVAILABLE, {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    console.log(`[updater] Already on latest version: ${info.version}`)
    sendToRenderer(IPC_CHANNELS.UPDATE_NOT_AVAILABLE, {
      version: info.version,
    })
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    sendToRenderer(IPC_CHANNELS.UPDATE_PROGRESS, {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log(`[updater] Update downloaded: ${info.version}`)
    sendToRenderer(IPC_CHANNELS.UPDATE_DOWNLOADED, {
      version: info.version,
    })
  })

  autoUpdater.on('error', (err: Error) => {
    console.error('[updater] Error:', err.message)
    sendToRenderer(IPC_CHANNELS.UPDATE_ERROR, {
      message: err.message,
    })
  })
}

/**
 * Check for updates. Returns update info if available.
 */
export async function checkForUpdates(): Promise<void> {
  try {
    await autoUpdater.checkForUpdates()
  } catch (err: any) {
    console.error('[updater] Check failed:', err.message)
    sendToRenderer(IPC_CHANNELS.UPDATE_ERROR, {
      message: err.message || 'Failed to check for updates',
    })
  }
}

/**
 * Download the available update.
 */
export async function downloadUpdate(): Promise<void> {
  try {
    await autoUpdater.downloadUpdate()
  } catch (err: any) {
    console.error('[updater] Download failed:', err.message)
    sendToRenderer(IPC_CHANNELS.UPDATE_ERROR, {
      message: err.message || 'Failed to download update',
    })
  }
}

/**
 * Quit the app and install the downloaded update.
 */
export function quitAndInstall(): void {
  autoUpdater.quitAndInstall()
}

function sendToRenderer(channel: string, data: any): void {
  try {
    if (mainWindow_ && !mainWindow_.isDestroyed()) {
      mainWindow_.webContents.send(channel, data)
    }
  } catch {
    // Window may be destroyed
  }
}
