import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join } from 'path'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dbPath = process.env.DB_PATH || join(process.cwd(), 'flowcopy-server.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Run schema
  try {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
    db.exec(schema)
  } catch {
    // Schema inline fallback
    db.exec(`
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch())
      );
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
      CREATE TABLE IF NOT EXISTS invite_codes (
        code TEXT PRIMARY KEY,
        team_id TEXT NOT NULL REFERENCES teams(id),
        created_by TEXT NOT NULL REFERENCES users(id),
        max_uses INTEGER DEFAULT 10,
        uses INTEGER DEFAULT 0,
        expires_at INTEGER,
        created_at INTEGER DEFAULT (unixepoch())
      );
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
    `)
  }

  return db
}
