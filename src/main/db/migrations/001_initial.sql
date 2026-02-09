-- Settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('openai_api_key', ''),
  ('openai_model_transcription', 'gpt-4o-transcribe'),
  ('openai_model_polish', 'gpt-4o'),
  ('hotkey', 'CommandOrControl+Shift+Space'),
  ('recording_mode', 'push_to_talk'),
  ('auto_paste', 'true'),
  ('language', 'auto'),
  ('theme', 'system'),
  ('launch_at_login', 'false'),
  ('show_tray_icon', 'true'),
  ('audio_input_device', 'default'),
  ('silence_threshold_ms', '1500'),
  ('max_recording_seconds', '300'),
  ('team_server_url', ''),
  ('team_auth_token', '');

-- Personal Dictionary
CREATE TABLE IF NOT EXISTS dictionary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL UNIQUE,
  replacement TEXT,
  category TEXT DEFAULT 'general',
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_dictionary_word ON dictionary(word);
