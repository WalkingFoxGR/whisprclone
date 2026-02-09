export const APP_NAME = 'FlowCopy'
export const APP_ID = 'com.flowcopy.app'

export const DEFAULT_HOTKEY = 'CommandOrControl+Shift+Space'

export const DEFAULT_SETTINGS = {
  openai_api_key: '',
  openai_model_transcription: 'gpt-4o-transcribe',
  openai_model_polish: 'gpt-4o',
  hotkey: DEFAULT_HOTKEY,
  recording_mode: 'push_to_talk' as const,
  auto_paste: true,
  language: 'auto',
  theme: 'system' as const,
  launch_at_login: false,
  show_tray_icon: true,
  audio_input_device: 'default',
  silence_threshold_ms: 1500,
  max_recording_seconds: 300,
  team_server_url: '',
  team_auth_token: '',
}

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'el', name: 'Greek' },
  { code: 'cs', name: 'Czech' },
  { code: 'ro', name: 'Romanian' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'he', name: 'Hebrew' },
  { code: 'no', name: 'Norwegian' },
] as const

export const TONE_OPTIONS = [
  { value: 'neutral', label: 'Neutral', description: 'Clean and straightforward' },
  { value: 'casual', label: 'Casual', description: 'Friendly and conversational' },
  { value: 'formal', label: 'Formal', description: 'Professional and polished' },
  { value: 'technical', label: 'Technical', description: 'Precise and detailed' },
] as const

export const TRANSCRIPTION_MODELS = [
  { value: 'gpt-4o-transcribe', label: 'GPT-4o Transcribe (recommended)' },
  { value: 'whisper-1', label: 'Whisper-1 (legacy)' },
] as const

export const POLISH_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o (recommended)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (faster, cheaper)' },
] as const

// Average typing speed: 40 WPM. Voice with Flow: ~160 WPM.
// Time saved = word_count * (1/40 - 1/160) minutes
export const TYPING_WPM = 40
export const VOICE_WPM = 160
