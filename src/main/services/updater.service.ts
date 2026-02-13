/**
 * Auto-update service for UNSIGNED macOS apps.
 *
 * Electron's built-in Squirrel.Mac updater enforces code signature verification,
 * which fails for ad-hoc / unsigned apps with:
 *   "code failed to satisfy specified code requirement(s)"
 *
 * This custom updater bypasses Squirrel entirely:
 * 1. Checks GitHub Releases API for a newer version
 * 2. Downloads the .zip artifact directly
 * 3. Extracts it and replaces the current .app bundle
 * 4. Relaunches the app
 */

import { BrowserWindow, app, dialog, shell } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import { execSync, exec } from 'child_process'

let mainWindow_: BrowserWindow | null = null

interface GitHubRelease {
  tag_name: string
  name: string
  published_at: string
  body: string
  assets: Array<{
    name: string
    browser_download_url: string
    size: number
  }>
}

// GitHub repo info — must match electron-builder publish config
const GITHUB_OWNER = 'WalkingFoxGR'
const GITHUB_REPO = 'whisprclone'

/**
 * Initialize the updater. Call once on app startup.
 */
export function initUpdater(mainWindow: BrowserWindow): void {
  mainWindow_ = mainWindow
}

/**
 * Compare two semver strings. Returns 1 if a > b, -1 if a < b, 0 if equal.
 */
function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1
    if ((pa[i] || 0) < (pb[i] || 0)) return -1
  }
  return 0
}

/**
 * Fetch JSON from a URL (follows redirects).
 */
function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get
    get(url, { headers: { 'User-Agent': 'VoxPilot-Updater' } }, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`))
      }
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(e) }
      })
      res.on('error', reject)
    }).on('error', reject)
  })
}

/**
 * Download a file to disk with progress reporting.
 */
function downloadFile(url: string, destPath: string, onProgress?: (percent: number, transferred: number, total: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get
    get(url, { headers: { 'User-Agent': 'VoxPilot-Updater' } }, (res) => {
      // Follow redirects (GitHub sends 302 to S3)
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath, onProgress).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} downloading update`))
      }
      const totalBytes = parseInt(res.headers['content-length'] || '0', 10)
      let transferred = 0

      const fileStream = fs.createWriteStream(destPath)
      res.on('data', (chunk: Buffer) => {
        transferred += chunk.length
        if (onProgress && totalBytes > 0) {
          onProgress(Math.round((transferred / totalBytes) * 100), transferred, totalBytes)
        }
      })
      res.pipe(fileStream)
      fileStream.on('finish', () => {
        fileStream.close()
        resolve()
      })
      fileStream.on('error', reject)
      res.on('error', reject)
    }).on('error', reject)
  })
}

/**
 * Check for updates. Compares current version against latest GitHub release.
 */
export async function checkForUpdates(): Promise<void> {
  try {
    console.log('[updater] Checking for updates...')
    const release: GitHubRelease = await fetchJSON(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
    )

    const latestVersion = release.tag_name.replace(/^v/, '')
    const currentVersion = app.getVersion()

    console.log(`[updater] Current: ${currentVersion}, Latest: ${latestVersion}`)

    if (compareSemver(latestVersion, currentVersion) > 0) {
      console.log(`[updater] Update available: ${latestVersion}`)
      sendToRenderer(IPC_CHANNELS.UPDATE_AVAILABLE, {
        version: latestVersion,
        releaseDate: release.published_at,
        releaseNotes: release.body || '',
      })
    } else {
      console.log(`[updater] Already on latest version`)
      sendToRenderer(IPC_CHANNELS.UPDATE_NOT_AVAILABLE, {
        version: currentVersion,
      })
    }
  } catch (err: any) {
    console.error('[updater] Check failed:', err.message)
    sendToRenderer(IPC_CHANNELS.UPDATE_ERROR, {
      message: err.message || 'Failed to check for updates',
    })
  }
}

/**
 * Download the latest update ZIP from GitHub.
 */
export async function downloadUpdate(): Promise<void> {
  try {
    console.log('[updater] Downloading update...')

    const release: GitHubRelease = await fetchJSON(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
    )

    // Find the arm64 zip (or universal zip)
    const zipAsset = release.assets.find(a =>
      a.name.endsWith('-mac.zip') || a.name.endsWith('-arm64-mac.zip')
    )

    if (!zipAsset) {
      throw new Error('No macOS ZIP found in release assets')
    }

    console.log(`[updater] Downloading ${zipAsset.name} (${(zipAsset.size / 1024 / 1024).toFixed(1)} MB)`)

    // Download to a temp location
    const tmpDir = path.join(app.getPath('temp'), 'voxpilot-update')
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true })
    }
    fs.mkdirSync(tmpDir, { recursive: true })

    const zipPath = path.join(tmpDir, zipAsset.name)

    await downloadFile(zipAsset.browser_download_url, zipPath, (percent, transferred, total) => {
      sendToRenderer(IPC_CHANNELS.UPDATE_PROGRESS, {
        percent,
        bytesPerSecond: 0,
        transferred,
        total,
      })
    })

    console.log(`[updater] Download complete: ${zipPath}`)

    sendToRenderer(IPC_CHANNELS.UPDATE_DOWNLOADED, {
      version: release.tag_name.replace(/^v/, ''),
    })
  } catch (err: any) {
    console.error('[updater] Download failed:', err.message)
    sendToRenderer(IPC_CHANNELS.UPDATE_ERROR, {
      message: err.message || 'Failed to download update',
    })
  }
}

/**
 * Install the downloaded update by extracting the ZIP and replacing the current .app.
 * Then relaunch the app.
 */
export function quitAndInstall(): void {
  try {
    const tmpDir = path.join(app.getPath('temp'), 'voxpilot-update')
    const zipFiles = fs.readdirSync(tmpDir).filter(f => f.endsWith('.zip'))

    if (zipFiles.length === 0) {
      console.error('[updater] No downloaded ZIP found')
      return
    }

    const zipPath = path.join(tmpDir, zipFiles[0])
    const extractDir = path.join(tmpDir, 'extracted')

    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true })
    }
    fs.mkdirSync(extractDir, { recursive: true })

    console.log(`[updater] Extracting ${zipPath}...`)

    // Extract the zip
    execSync(`ditto -xk "${zipPath}" "${extractDir}"`)

    // Find the .app inside the extracted folder
    const extractedApps = fs.readdirSync(extractDir).filter(f => f.endsWith('.app'))
    if (extractedApps.length === 0) {
      throw new Error('No .app found in update ZIP')
    }

    const newAppPath = path.join(extractDir, extractedApps[0])

    // Find the .app bundle root — app.getAppPath() returns something like:
    //   /Applications/VoxPilot.app/Contents/Resources/app.asar
    // We need to walk up to find the .app directory
    let currentAppPath = app.getAppPath()
    while (currentAppPath && !currentAppPath.endsWith('.app')) {
      const parent = path.dirname(currentAppPath)
      if (parent === currentAppPath) break // reached filesystem root
      currentAppPath = parent
    }

    if (!currentAppPath.endsWith('.app')) {
      throw new Error(`Could not determine .app bundle path from: ${app.getAppPath()}`)
    }

    console.log(`[updater] Current app: ${currentAppPath}`)
    console.log(`[updater] New app: ${newAppPath}`)

    // Remove quarantine from the new app
    try {
      execSync(`xattr -rd com.apple.quarantine "${newAppPath}" 2>/dev/null || true`)
    } catch {}

    // NOTE: Do NOT re-sign the app here. The app is already properly signed
    // by the afterPack build hook with identifier "com.voxpilot.app".
    // Re-signing creates a new code hash which invalidates macOS TCC permissions
    // (Accessibility, Input Monitoring), breaking auto-paste and Fn key.

    // Use a shell script that waits for the app to quit, then replaces and relaunches
    const script = `#!/bin/bash
# Wait for VoxPilot to quit
sleep 2

# Replace the old app with the new one
rm -rf "${currentAppPath}"
mv "${newAppPath}" "${currentAppPath}"

# Remove quarantine again after move
xattr -rd com.apple.quarantine "${currentAppPath}" 2>/dev/null || true

# Relaunch
open "${currentAppPath}"

# Cleanup
rm -rf "${tmpDir}"
`

    const scriptPath = path.join(tmpDir, 'install-update.sh')
    fs.writeFileSync(scriptPath, script, { mode: 0o755 })

    // Launch the update script in the background
    exec(`"${scriptPath}"`, { detached: true, stdio: 'ignore' })

    console.log('[updater] Update script launched, quitting app...')

    // Quit the app so the script can replace it
    app.quit()
  } catch (err: any) {
    console.error('[updater] Install failed:', err.message)
    dialog.showErrorBox('Update Failed', `Failed to install update: ${err.message}\n\nPlease download the latest version manually from GitHub.`)
  }
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
