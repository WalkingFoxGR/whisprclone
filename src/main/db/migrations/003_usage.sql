-- Usage Log (individual transcriptions)
CREATE TABLE IF NOT EXISTS usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_text TEXT,
  polished_text TEXT,
  word_count INTEGER NOT NULL DEFAULT 0,
  recording_duration_ms INTEGER NOT NULL,
  processing_duration_ms INTEGER,
  target_app TEXT,
  language_detected TEXT,
  tone_used TEXT,
  snippet_used TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  synced_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_synced ON usage_log(synced_at);

-- Daily Aggregates (pre-computed for fast dashboard queries)
CREATE TABLE IF NOT EXISTS usage_daily (
  date TEXT PRIMARY KEY,
  total_words INTEGER DEFAULT 0,
  total_recordings INTEGER DEFAULT 0,
  total_recording_ms INTEGER DEFAULT 0,
  total_processing_ms INTEGER DEFAULT 0,
  top_app TEXT,
  updated_at INTEGER DEFAULT (unixepoch())
);
