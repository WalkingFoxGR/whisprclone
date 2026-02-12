// Settings
export interface AppSettings {
  openai_api_key: string
  openai_model_transcription: string
  openai_model_polish: string
  hotkey: string
  recording_mode: 'push_to_talk' | 'toggle'
  auto_paste: boolean
  language: string
  theme: 'light' | 'dark' | 'system'
  launch_at_login: boolean
  show_tray_icon: boolean
  audio_input_device: string
  silence_threshold_ms: number
  max_recording_seconds: number
  team_server_url: string
  team_auth_token: string
  // Groq provider
  transcription_provider: 'openai' | 'groq'
  groq_api_key: string
  // Cost optimization
  smart_polish_skip: boolean
}

// Dictionary
export interface DictionaryEntry {
  id: number
  word: string
  replacement: string | null
  category: 'name' | 'technical' | 'general'
  created_at: number
}

export interface DictionaryInput {
  word: string
  replacement?: string
  category?: DictionaryEntry['category']
}

// Snippets
export interface Snippet {
  id: number
  trigger_phrase: string
  expansion: string
  category: string
  use_count: number
  created_at: number
  updated_at: number
}

export interface SnippetInput {
  trigger_phrase: string
  expansion: string
  category?: string
}

// Tone Profiles
export interface ToneProfile {
  id: number
  app_identifier: string
  app_name: string
  tone: 'casual' | 'formal' | 'technical' | 'neutral'
  custom_instructions: string | null
  created_at: number
}

export interface ToneProfileInput {
  app_identifier: string
  app_name: string
  tone: ToneProfile['tone']
  custom_instructions?: string
}

// Usage
export interface UsageEntry {
  id: number
  raw_text: string | null
  polished_text: string | null
  word_count: number
  recording_duration_ms: number
  processing_duration_ms: number | null
  target_app: string | null
  language_detected: string | null
  tone_used: string | null
  snippet_used: string | null
  estimated_cost_cents: number
  transcription_model: string | null
  polish_model: string | null
  created_at: number
  synced_at: number | null
}

export interface UsageLogInput {
  raw_text?: string
  polished_text?: string
  word_count: number
  recording_duration_ms: number
  processing_duration_ms?: number
  target_app?: string
  language_detected?: string
  tone_used?: string
  snippet_used?: string
  estimated_cost_cents?: number
  transcription_model?: string
  polish_model?: string
}

export interface DailyUsage {
  date: string
  total_words: number
  total_recordings: number
  total_recording_ms: number
  total_processing_ms: number
  top_app: string | null
  total_cost_cents: number
}

export interface UsageStats {
  today: { words: number; recordings: number; time_saved_ms: number; cost_cents: number }
  week: { words: number; recordings: number; time_saved_ms: number; cost_cents: number }
  month: { words: number; recordings: number; time_saved_ms: number; cost_cents: number }
  all_time: { words: number; recordings: number; cost_cents: number }
  daily: DailyUsage[]
  top_apps: { app: string; count: number }[]
}

// Recording State
export type RecordingState = 'idle' | 'recording' | 'transcribing' | 'polishing' | 'pasting' | 'error'

export interface RecordingStatus {
  state: RecordingState
  duration_ms?: number
  error?: string
  result?: {
    raw_text: string
    polished_text: string
    word_count: number
  }
}

// Auth
export interface AuthStatus {
  authenticated: boolean
  user?: {
    id: string
    email: string
    name: string
    team_id: string
    team_name: string
    role: 'admin' | 'member'
  }
}

// Permissions
export interface PermissionStatus {
  microphone: 'granted' | 'denied' | 'not-determined'
  accessibility: boolean
}

// Audio Device
export interface AudioDevice {
  deviceId: string
  label: string
  kind: 'audioinput'
}
