-- Snippet Library
CREATE TABLE IF NOT EXISTS snippets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_phrase TEXT NOT NULL UNIQUE,
  expansion TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  use_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_snippets_trigger ON snippets(trigger_phrase);

-- Tone Profiles
CREATE TABLE IF NOT EXISTS tone_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_identifier TEXT NOT NULL UNIQUE,
  app_name TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'neutral',
  custom_instructions TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_tone_app ON tone_profiles(app_identifier);
