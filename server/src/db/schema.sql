-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  team_id TEXT NOT NULL REFERENCES teams(id),
  role TEXT NOT NULL DEFAULT 'member',
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);

-- Invite Codes
CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  max_uses INTEGER DEFAULT 10,
  uses INTEGER DEFAULT 0,
  expires_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Team Usage (synced from desktop clients)
CREATE TABLE IF NOT EXISTS team_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  word_count INTEGER NOT NULL DEFAULT 0,
  recording_duration_ms INTEGER NOT NULL,
  processing_duration_ms INTEGER,
  target_app TEXT,
  language_detected TEXT,
  tone_used TEXT,
  recorded_at INTEGER NOT NULL,
  synced_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_team_usage_user ON team_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_team_usage_recorded ON team_usage(recorded_at);

-- Shared Dictionary
CREATE TABLE IF NOT EXISTS shared_dictionary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id TEXT NOT NULL REFERENCES teams(id),
  word TEXT NOT NULL,
  replacement TEXT,
  category TEXT DEFAULT 'general',
  added_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(team_id, word)
);

CREATE INDEX IF NOT EXISTS idx_shared_dict_team ON shared_dictionary(team_id);
