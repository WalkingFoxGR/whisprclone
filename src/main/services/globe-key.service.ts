/**
 * Globe Key Service — macOS Fn/Globe key hold detection via native Swift helper.
 *
 * The Fn/Globe key on Mac doesn't send normal key-down/key-up events through
 * uiohook. Instead, it fires as a modifier flag change (CGEventFlags.maskSecondaryFn).
 * This service spawns a tiny Swift binary that monitors CGEvent flags and reports
 * FN_DOWN / FN_UP via stdout, enabling true hold-to-record with the Fn key.
 */

import { spawn, ChildProcess } from 'child_process'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

type GlobeKeyCallback = (state: 'down' | 'up') => void

let process_: ChildProcess | null = null
let callback_: GlobeKeyCallback | null = null
let isRunning = false

/**
 * Find the globe-key-listener binary.
 * In dev: resources/globe-key-listener
 * In packaged app: Contents/Resources/globe-key-listener
 */
function findBinary(): string | null {
  const candidates = [
    // Dev mode — project root resources/
    path.join(app.getAppPath(), 'resources', 'globe-key-listener'),
    // Dev mode — from out/main/ up to project root
    path.join(app.getAppPath(), '..', '..', 'resources', 'globe-key-listener'),
    // Packaged — asar parent
    path.join(path.dirname(app.getAppPath()), 'globe-key-listener'),
    // Packaged — Resources folder
    path.join(path.dirname(app.getAppPath()), 'Resources', 'globe-key-listener'),
  ]

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log(`[globe-key] Found binary at: ${p}`)
      return p
    }
  }

  console.error('[globe-key] Binary not found. Searched:', candidates)
  return null
}

/**
 * Start the globe key listener. Only works on macOS.
 */
export function startGlobeKeyListener(onKeyEvent: GlobeKeyCallback): boolean {
  if (process.platform !== 'darwin') {
    console.log('[globe-key] Not macOS, skipping globe key listener')
    return false
  }

  if (isRunning) {
    console.log('[globe-key] Already running')
    callback_ = onKeyEvent
    return true
  }

  const binary = findBinary()
  if (!binary) return false

  // Make sure it's executable
  try {
    fs.chmodSync(binary, 0o755)
  } catch {
    // ignore — might already be executable
  }

  callback_ = onKeyEvent

  try {
    process_ = spawn(binary, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let buffer = ''

    process_.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString()
      const lines = buffer.split('\n')
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed === 'READY') {
          console.log('[globe-key] Listener ready')
          isRunning = true
        } else if (trimmed === 'FN_DOWN') {
          callback_?.('down')
        } else if (trimmed === 'FN_UP') {
          callback_?.('up')
        }
      }
    })

    process_.stderr?.on('data', (data: Buffer) => {
      console.error('[globe-key] stderr:', data.toString().trim())
    })

    process_.on('exit', (code) => {
      console.log(`[globe-key] Process exited with code ${code}`)
      isRunning = false
      process_ = null
    })

    process_.on('error', (err) => {
      console.error('[globe-key] Process error:', err.message)
      isRunning = false
      process_ = null
    })

    console.log('[globe-key] Spawned globe key listener')
    return true
  } catch (err) {
    console.error('[globe-key] Failed to spawn:', err)
    return false
  }
}

/**
 * Stop the globe key listener.
 */
export function stopGlobeKeyListener(): void {
  if (process_) {
    try {
      process_.kill('SIGTERM')
    } catch {
      // ignore
    }
    process_ = null
  }
  isRunning = false
  callback_ = null
  console.log('[globe-key] Stopped')
}

/**
 * Check if the globe key listener is available (macOS only + binary exists).
 */
export function isGlobeKeyAvailable(): boolean {
  return process.platform === 'darwin' && findBinary() !== null
}
