import { BrowserWindow } from 'electron'
import { uIOhook, UiohookKey, UiohookKeyboardEvent } from 'uiohook-napi'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { getDatabase } from '../db/database'
import { SettingsRepository } from '../db/repositories/settings.repo'
import { startGlobeKeyListener, stopGlobeKeyListener } from './globe-key.service'

let isRecording = false
let recordingStartTime: number | null = null
let hotkeyStarted = false
let globeKeyActive = false // true when Fn/Globe is the target and native listener is active

// The target key combo we're listening for
let targetKeycode: number | null = null
let targetModifiers: { ctrl: boolean; alt: boolean; shift: boolean; meta: boolean } = {
  ctrl: false, alt: false, shift: false, meta: false,
}

// Capture mode state
let isCapturing = false
let captureCallback: ((result: { keycode: number; mods: typeof targetModifiers; displayName: string }) => void) | null = null
let captureTimeout: ReturnType<typeof setTimeout> | null = null
let capturedKeys: Set<number> = new Set()
let capturedMods = { ctrl: false, alt: false, shift: false, meta: false }

// Minimum hold time before key-up stops recording (prevents rapid key-up from canceling)
const MIN_RECORDING_MS = 300

// Live modifier state — tracked from uiohook events so the globe key callback
// can check if required modifiers (Cmd, Ctrl, etc.) are currently held down.
let liveModifiers = { ctrl: false, alt: false, shift: false, meta: false }

// Callbacks
let _mainWindow: BrowserWindow | null = null
let _recorderWindow: BrowserWindow | null = null
let _onRecordingStart: (() => void) | null = null
let _onRecordingStop: (() => void) | null = null

// Set of modifier keycodes (left + right variants)
const MODIFIER_KEYCODES = new Set([
  UiohookKey.Ctrl, UiohookKey.CtrlRight,
  UiohookKey.Alt, UiohookKey.AltRight,
  UiohookKey.Shift, UiohookKey.ShiftRight,
  UiohookKey.Meta, UiohookKey.MetaRight,
])

// Map modifier keycodes to their mod flag name
function keyIsModifier(keycode: number): 'ctrl' | 'alt' | 'shift' | 'meta' | null {
  if (keycode === UiohookKey.Ctrl || keycode === UiohookKey.CtrlRight) return 'ctrl'
  if (keycode === UiohookKey.Alt || keycode === UiohookKey.AltRight) return 'alt'
  if (keycode === UiohookKey.Shift || keycode === UiohookKey.ShiftRight) return 'shift'
  if (keycode === UiohookKey.Meta || keycode === UiohookKey.MetaRight) return 'meta'
  return null
}

export function getRecordingState() {
  return {
    isRecording,
    startTime: recordingStartTime,
    duration: recordingStartTime ? Date.now() - recordingStartTime : 0,
  }
}

/**
 * Convert an Electron accelerator string into a uiohook keycode + modifier flags.
 */
function parseAccelerator(accel: string): { keycode: number; mods: typeof targetModifiers } | null {
  const parts = accel.split('+')
  const mods = { ctrl: false, alt: false, shift: false, meta: false }
  let mainKey: string | null = null

  for (const part of parts) {
    const p = part.trim()
    switch (p) {
      case 'CommandOrControl':
      case 'CmdOrCtrl':
        if (process.platform === 'darwin') { mods.meta = true } else { mods.ctrl = true }
        break
      case 'Command': case 'Cmd': case 'Super': mods.meta = true; break
      case 'Control': case 'Ctrl': mods.ctrl = true; break
      case 'Alt': case 'Option': mods.alt = true; break
      case 'Shift': mods.shift = true; break
      default: mainKey = p
    }
  }

  if (!mainKey) return null
  const keycode = acceleratorKeyToUiohook(mainKey)
  if (keycode === null) return null
  return { keycode, mods }
}

function acceleratorKeyToUiohook(key: string): number | null {
  if (key.length === 1 && /^[A-Z]$/i.test(key)) {
    const k = key.toUpperCase() as keyof typeof UiohookKey
    return (UiohookKey as any)[k] ?? null
  }
  if (key.length === 1 && /^[0-9]$/.test(key)) {
    return (UiohookKey as any)[key] ?? null
  }
  const map: Record<string, keyof typeof UiohookKey> = {
    Space: 'Space', Backspace: 'Backspace', Delete: 'Delete', Return: 'Enter',
    Tab: 'Tab', Escape: 'Escape',
    Up: 'ArrowUp', Down: 'ArrowDown', Left: 'ArrowLeft', Right: 'ArrowRight',
    Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown', Insert: 'Insert',
    F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6',
    F7: 'F7', F8: 'F8', F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12',
    F13: 'F13', F14: 'F14', F15: 'F15', F16: 'F16', F17: 'F17', F18: 'F18',
    F19: 'F19', F20: 'F20',
    '-': 'Minus', '=': 'Equal', '[': 'BracketLeft', ']': 'BracketRight',
    '\\': 'Backslash', ';': 'Semicolon', "'": 'Quote', ',': 'Comma',
    '.': 'Period', '/': 'Slash', '`': 'Backquote',
  }
  const mapped = map[key]
  if (mapped) return UiohookKey[mapped]
  return null
}

function modifiersMatch(e: UiohookKeyboardEvent): boolean {
  const ctrl = targetModifiers.ctrl ? e.ctrlKey : !e.ctrlKey
  const alt = targetModifiers.alt ? e.altKey : !e.altKey
  const shift = targetModifiers.shift ? e.shiftKey : !e.shiftKey
  const meta = targetModifiers.meta ? e.metaKey : !e.metaKey
  return ctrl && alt && shift && meta
}

// ============================================================
// Capture mode: collect key combo with timeout
// ============================================================

/**
 * Finalize capture — send the collected keys back to the caller.
 * Called either when a non-modifier key arrives, or after 500ms timeout
 * if only modifiers/Fn were pressed.
 */
function finalizeCapture(): void {
  if (!isCapturing || !captureCallback) return
  if (captureTimeout) { clearTimeout(captureTimeout); captureTimeout = null }

  // Find the "main" key (non-modifier). If none, use the first captured key.
  let mainKeycode: number | null = null
  for (const kc of capturedKeys) {
    if (!MODIFIER_KEYCODES.has(kc)) {
      mainKeycode = kc
      break
    }
  }
  // If only modifiers/Fn were pressed, pick the first one as the main key
  if (mainKeycode === null) {
    mainKeycode = capturedKeys.values().next().value ?? 0
    // Clear the mods flag that matches this key so it's not duplicated
    const modName = keyIsModifier(mainKeycode)
    if (modName) capturedMods[modName] = false
  }

  const displayName = hotkeyToDisplayString(mainKeycode, capturedMods)
  console.log(`[hotkey] Captured: keycode=${mainKeycode}, mods=${JSON.stringify(capturedMods)}, display="${displayName}"`)

  captureCallback({ keycode: mainKeycode, mods: { ...capturedMods }, displayName })
  isCapturing = false
  captureCallback = null
  capturedKeys.clear()
  capturedMods = { ctrl: false, alt: false, shift: false, meta: false }
}

function onCaptureKeyDown(e: UiohookKeyboardEvent): void {
  // Reset the timeout each time a new key comes in
  if (captureTimeout) { clearTimeout(captureTimeout); captureTimeout = null }

  capturedKeys.add(e.keycode)

  // Track modifier state
  const modName = keyIsModifier(e.keycode)
  if (modName) {
    capturedMods[modName] = true
  }

  // If this is a non-modifier key (and not Fn/keycode 0), finalize immediately
  // This handles combos like Fn+M — Fn arrives first (tracked), then M arrives and we finalize
  if (!MODIFIER_KEYCODES.has(e.keycode) && e.keycode !== 0) {
    // Update mods from event state (more reliable for combos)
    capturedMods.ctrl = capturedMods.ctrl || e.ctrlKey
    capturedMods.alt = capturedMods.alt || e.altKey
    capturedMods.shift = capturedMods.shift || e.shiftKey
    capturedMods.meta = capturedMods.meta || e.metaKey
    finalizeCapture()
    return
  }

  // For modifiers/Fn: set a timeout — if no more keys arrive in 500ms, finalize with just this key
  captureTimeout = setTimeout(() => {
    finalizeCapture()
  }, 500)
}

// ============================================================
// Normal hotkey matching
// ============================================================

function onKeyDown(e: UiohookKeyboardEvent): void {
  // Always track live modifier state
  liveModifiers.ctrl = e.ctrlKey
  liveModifiers.alt = e.altKey
  liveModifiers.shift = e.shiftKey
  liveModifiers.meta = e.metaKey

  // --- Capture mode ---
  if (isCapturing && captureCallback) {
    onCaptureKeyDown(e)
    return
  }

  // If Fn/Globe is active via native listener, uiohook keycode 0 events are ignored
  if (globeKeyActive && e.keycode === 0) return

  // Check if this key matches our target
  if (e.keycode !== targetKeycode) return

  // For non-modifier target keys, also check modifiers match
  const targetIsModifierOrFn = targetKeycode === 0 || MODIFIER_KEYCODES.has(targetKeycode)
  if (!targetIsModifierOrFn && !modifiersMatch(e)) return

  // --- Normal push-to-talk mode ---
  if (!isRecording) {
    console.log('[hotkey] key-down matched, starting recording')
    startRecordingAction()
  }
}

function onKeyUp(e: UiohookKeyboardEvent): void {
  // Always track live modifier state
  liveModifiers.ctrl = e.ctrlKey
  liveModifiers.alt = e.altKey
  liveModifiers.shift = e.shiftKey
  liveModifiers.meta = e.metaKey

  if (!isRecording) return

  // If Fn/Globe is active via native listener, ignore uiohook keycode 0 events
  // BUT still check if a required modifier was released (e.g. Cmd in Cmd+Fn combo)
  if (globeKeyActive && e.keycode === 0) return

  // Debounce: ignore key-up if recording started less than MIN_RECORDING_MS ago
  if (recordingStartTime && (Date.now() - recordingStartTime) < MIN_RECORDING_MS) {
    return
  }

  // If ANY part of the hotkey combo is released, stop recording
  const mainKeyReleased = e.keycode === targetKeycode
  const requiredModifierReleased =
    (targetModifiers.ctrl && (e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight)) ||
    (targetModifiers.alt && (e.keycode === UiohookKey.Alt || e.keycode === UiohookKey.AltRight)) ||
    (targetModifiers.shift && (e.keycode === UiohookKey.Shift || e.keycode === UiohookKey.ShiftRight)) ||
    (targetModifiers.meta && (e.keycode === UiohookKey.Meta || e.keycode === UiohookKey.MetaRight))

  if (mainKeyReleased || requiredModifierReleased) {
    console.log('[hotkey] key-up detected, stopping recording')
    stopRecordingAction()
  }
}

function startRecordingAction(): void {
  if (isRecording) return

  isRecording = true
  recordingStartTime = Date.now()

  _recorderWindow?.webContents.send(IPC_CHANNELS.RECORDING_START)
  _mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATUS, {
    state: 'recording',
    duration_ms: 0,
  })
  _onRecordingStart?.()
}

function stopRecordingAction(): void {
  if (!isRecording) return

  isRecording = false
  const duration = recordingStartTime ? Date.now() - recordingStartTime : 0
  recordingStartTime = null

  _recorderWindow?.webContents.send(IPC_CHANNELS.RECORDING_STOP)
  _mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATUS, {
    state: 'transcribing',
    duration_ms: duration,
  })
  _onRecordingStop?.()
}

export function registerHotkey(
  mainWindow: BrowserWindow | null,
  recorderWindow: BrowserWindow | null,
  onRecordingStart: () => void,
  onRecordingStop: () => void
): void {
  const db = getDatabase()
  const settings = new SettingsRepository(db)
  const hotkey = settings.get('hotkey') || 'CommandOrControl+Shift+Space'

  _mainWindow = mainWindow
  _recorderWindow = recorderWindow
  _onRecordingStart = onRecordingStart
  _onRecordingStop = onRecordingStop

  const parsed = parseAccelerator(hotkey)
  if (!parsed) {
    console.error(`[hotkey] Failed to parse hotkey: ${hotkey}`)
    return
  }

  targetKeycode = parsed.keycode
  targetModifiers = parsed.mods
  console.log(`[hotkey] Registered: "${hotkey}" → keycode=${targetKeycode}, mods=${JSON.stringify(targetModifiers)}`)

  // Start native globe key listener for Fn key (keycode 0)
  activateGlobeKeyIfNeeded()

  if (!hotkeyStarted) {
    uIOhook.on('keydown', onKeyDown)
    uIOhook.on('keyup', onKeyUp)
    uIOhook.start()
    hotkeyStarted = true
    console.log('[hotkey] uiohook listener started')
  }
}

// ============================================================
// Globe key (Fn) native listener management
// ============================================================

/**
 * If the target keycode is 0 (Fn/Globe), start the native Swift listener
 * for true hold-to-talk support. The native listener uses CGEvent flags
 * which properly track Fn hold state (unlike uiohook which only gets
 * instant key-down/key-up for Fn on Mac).
 */
function activateGlobeKeyIfNeeded(): void {
  // Stop any previous globe key listener
  if (globeKeyActive) {
    stopGlobeKeyListener()
    globeKeyActive = false
  }

  if (targetKeycode !== 0) return
  if (process.platform !== 'darwin') return

  const hasModifiers = targetModifiers.ctrl || targetModifiers.alt || targetModifiers.shift || targetModifiers.meta

  console.log('[hotkey] Target is Fn/Globe — activating native globe key listener' +
    (hasModifiers ? ` (requires mods: ${JSON.stringify(targetModifiers)})` : ' (no modifiers)'))

  const started = startGlobeKeyListener((state) => {
    if (state === 'down') {
      if (isRecording) return

      // If the hotkey has modifiers (e.g. Cmd+Fn), check they're currently held
      if (hasModifiers) {
        const modsOk =
          (!targetModifiers.ctrl || liveModifiers.ctrl) &&
          (!targetModifiers.alt || liveModifiers.alt) &&
          (!targetModifiers.shift || liveModifiers.shift) &&
          (!targetModifiers.meta || liveModifiers.meta)

        if (!modsOk) {
          // Fn pressed but required modifiers not held — ignore
          return
        }
      }

      console.log('[hotkey] Globe FN_DOWN → starting recording')
      startRecordingAction()
    } else if (state === 'up') {
      if (isRecording) {
        console.log('[hotkey] Globe FN_UP → stopping recording')
        stopRecordingAction()
      }
    }
  })

  if (started) {
    globeKeyActive = true
    console.log('[hotkey] Native globe key listener active — hold-to-talk enabled for Fn')
  } else {
    console.warn('[hotkey] Failed to start native globe key listener, Fn may not work as hold-to-talk')
  }
}

export function unregisterHotkey(): void {
  if (globeKeyActive) {
    stopGlobeKeyListener()
    globeKeyActive = false
  }
  targetKeycode = null
  targetModifiers = { ctrl: false, alt: false, shift: false, meta: false }
}

export function unregisterAll(): void {
  if (globeKeyActive) {
    stopGlobeKeyListener()
    globeKeyActive = false
  }
  targetKeycode = null
  targetModifiers = { ctrl: false, alt: false, shift: false, meta: false }
  if (hotkeyStarted) {
    try { uIOhook.stop() } catch { /* ignore */ }
    hotkeyStarted = false
  }
}

// ============================================================
// Display helpers
// ============================================================

function keycodeToDisplayName(keycode: number): string {
  if (keycode === 0) return 'Fn'
  for (const [name, code] of Object.entries(UiohookKey)) {
    if (code === keycode) return name
  }
  return `Key(${keycode})`
}

export function hotkeyToDisplayString(keycode: number, mods: { ctrl: boolean; alt: boolean; shift: boolean; meta: boolean }): string {
  const isMac = process.platform === 'darwin'
  const parts: string[] = []

  const isCtrlKey = keycode === UiohookKey.Ctrl || keycode === UiohookKey.CtrlRight
  const isAltKey = keycode === UiohookKey.Alt || keycode === UiohookKey.AltRight
  const isShiftKey = keycode === UiohookKey.Shift || keycode === UiohookKey.ShiftRight
  const isMetaKey = keycode === UiohookKey.Meta || keycode === UiohookKey.MetaRight

  if (mods.meta && !isMetaKey) parts.push(isMac ? '⌘' : 'Super')
  if (mods.ctrl && !isCtrlKey) parts.push(isMac ? '⌃' : 'Ctrl')
  if (mods.alt && !isAltKey) parts.push(isMac ? '⌥' : 'Alt')
  if (mods.shift && !isShiftKey) parts.push(isMac ? '⇧' : 'Shift')

  let keyName = keycodeToDisplayName(keycode)
  const prettyMap: Record<string, string> = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Backspace: '⌫', Delete: '⌦', Enter: '↩', Escape: 'Esc',
    Space: isMac ? '␣' : 'Space', CapsLock: 'CapsLock',
    Ctrl: isMac ? '⌃' : 'Ctrl', CtrlRight: isMac ? '⌃' : 'Ctrl',
    Alt: isMac ? '⌥' : 'Alt', AltRight: isMac ? '⌥' : 'Alt',
    Shift: isMac ? '⇧' : 'Shift', ShiftRight: isMac ? '⇧' : 'Shift',
    Meta: isMac ? '⌘' : 'Super', MetaRight: isMac ? '⌘' : 'Super',
    Fn: isMac ? '🌐' : 'Fn',
  }
  if (prettyMap[keyName]) keyName = prettyMap[keyName]

  parts.push(keyName)
  return parts.join(isMac ? '' : '+')
}

// ============================================================
// Public capture API
// ============================================================

export function startCapture(): Promise<{ keycode: number; mods: { ctrl: boolean; alt: boolean; shift: boolean; meta: boolean }; displayName: string }> {
  return new Promise((resolve) => {
    isCapturing = true
    captureCallback = resolve
    capturedKeys.clear()
    capturedMods = { ctrl: false, alt: false, shift: false, meta: false }
    if (captureTimeout) { clearTimeout(captureTimeout); captureTimeout = null }
    console.log('[hotkey] Capture mode started — press key combo')
  })
}

export function stopCapture(): void {
  isCapturing = false
  captureCallback = null
  capturedKeys.clear()
  capturedMods = { ctrl: false, alt: false, shift: false, meta: false }
  if (captureTimeout) { clearTimeout(captureTimeout); captureTimeout = null }
}

export function registerHotkeyRaw(
  keycode: number,
  mods: { ctrl: boolean; alt: boolean; shift: boolean; meta: boolean },
  mainWindow: BrowserWindow | null,
  recorderWindow: BrowserWindow | null,
  onRecordingStart: () => void,
  onRecordingStop: () => void
): void {
  _mainWindow = mainWindow
  _recorderWindow = recorderWindow
  _onRecordingStart = onRecordingStart
  _onRecordingStop = onRecordingStop

  targetKeycode = keycode
  targetModifiers = mods
  console.log(`[hotkey] Registered raw: keycode=${keycode}, mods=${JSON.stringify(mods)}, display="${hotkeyToDisplayString(keycode, mods)}"`)

  // Start native globe key listener for Fn key (keycode 0)
  activateGlobeKeyIfNeeded()

  if (!hotkeyStarted) {
    uIOhook.on('keydown', onKeyDown)
    uIOhook.on('keyup', onKeyUp)
    uIOhook.start()
    hotkeyStarted = true
    console.log('[hotkey] uiohook listener started')
  }
}
