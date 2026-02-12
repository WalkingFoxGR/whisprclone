export const IPC_CHANNELS = {
  // Recording
  RECORDING_START: 'recording:start',
  RECORDING_STOP: 'recording:stop',
  RECORDING_STATUS: 'recording:status',
  RECORDING_AUDIO_DATA: 'recording:audio-data',
  RECORDING_AUDIO_LEVEL: 'recording:audio-level',
  RECORDING_AUDIO_BINS: 'recording:audio-bins',

  // Transcription
  TRANSCRIBE_AUDIO: 'transcription:transcribe',
  TRANSCRIPTION_PROGRESS: 'transcription:progress',
  POLISH_TEXT: 'transcription:polish',

  // Clipboard / Paste
  PASTE_TEXT: 'clipboard:paste',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_ALL: 'settings:get-all',

  // Dictionary
  DICTIONARY_GET_ALL: 'dictionary:get-all',
  DICTIONARY_ADD: 'dictionary:add',
  DICTIONARY_REMOVE: 'dictionary:remove',
  DICTIONARY_UPDATE: 'dictionary:update',

  // Snippets
  SNIPPETS_GET_ALL: 'snippets:get-all',
  SNIPPETS_ADD: 'snippets:add',
  SNIPPETS_UPDATE: 'snippets:update',
  SNIPPETS_REMOVE: 'snippets:remove',

  // Tone Profiles
  TONE_GET_ALL: 'tone:get-all',
  TONE_SET: 'tone:set',
  TONE_REMOVE: 'tone:remove',
  TONE_DETECT_APP: 'tone:detect-app',

  // Auth
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_STATUS: 'auth:status',
  AUTH_VALIDATE_INVITE: 'auth:validate-invite',

  // Usage
  USAGE_GET_STATS: 'usage:get-stats',
  USAGE_GET_DAILY: 'usage:get-daily',
  USAGE_LOG: 'usage:log',
  USAGE_SYNC: 'usage:sync',

  // Hotkey capture
  HOTKEY_CAPTURE_START: 'hotkey:capture-start',
  HOTKEY_CAPTURE_STOP: 'hotkey:capture-stop',
  HOTKEY_CAPTURED: 'hotkey:captured',

  // App
  APP_GET_VERSION: 'app:version',
  APP_CHECK_PERMISSIONS: 'app:check-permissions',
  APP_REQUEST_PERMISSION: 'app:request-permission',
  APP_GET_AUDIO_DEVICES: 'app:get-audio-devices',

  // Auto-update
  UPDATE_CHECK: 'update:check',
  UPDATE_AVAILABLE: 'update:available',
  UPDATE_NOT_AVAILABLE: 'update:not-available',
  UPDATE_DOWNLOAD: 'update:download',
  UPDATE_PROGRESS: 'update:progress',
  UPDATE_DOWNLOADED: 'update:downloaded',
  UPDATE_INSTALL: 'update:install',
  UPDATE_ERROR: 'update:error',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
