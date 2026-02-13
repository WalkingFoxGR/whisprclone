/**
 * electron-builder afterPack hook — ad-hoc signs the app with correct bundle identifier.
 *
 * Without this, the packaged app gets `Identifier=Electron` (linker-signed),
 * which breaks macOS Accessibility/Input Monitoring permission persistence.
 */
const { execSync } = require('child_process')
const path = require('path')

module.exports = async function afterPack(context) {
  if (process.platform !== 'darwin') return

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  console.log(`[afterPack] Ad-hoc signing: ${appPath}`)

  try {
    // Sign the globe-key-listener binary first
    const globeKeyBinary = path.join(appPath, 'Contents', 'Resources', 'globe-key-listener')
    try {
      execSync(`codesign --force --sign - "${globeKeyBinary}"`, { stdio: 'pipe' })
      console.log('[afterPack] Signed globe-key-listener')
    } catch {
      console.warn('[afterPack] globe-key-listener not found or failed to sign (may not exist)')
    }

    // Sign all .node native modules
    try {
      execSync(`find "${appPath}" -name '*.node' -exec codesign --force --sign - {} \\;`, { stdio: 'pipe' })
      console.log('[afterPack] Signed native .node modules')
    } catch {
      console.warn('[afterPack] No .node modules found or signing failed')
    }

    // Sign the main executable
    const mainExe = path.join(appPath, 'Contents', 'MacOS', 'VoxPilot')
    execSync(`codesign --force --sign - --identifier "com.voxpilot.app" "${mainExe}"`, { stdio: 'pipe' })
    console.log('[afterPack] Signed main executable')

    // Sign the entire .app bundle
    execSync(`codesign --force --deep --sign - --identifier "com.voxpilot.app" "${appPath}"`, { stdio: 'pipe' })
    console.log('[afterPack] Signed app bundle with identifier com.voxpilot.app')
  } catch (err) {
    console.error('[afterPack] Signing failed:', err.message)
  }
}
