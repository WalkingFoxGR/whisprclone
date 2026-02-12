import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, readdirSync, existsSync, renameSync, copyFileSync } from 'fs'
import { dirname } from 'path'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (db) return db

  const userData = app.getPath('userData')
  const dbPath = join(userData, 'voxpilot.db')

  // Migrate from old FlowCopy database (different app folder)
  const oldAppFolder = join(dirname(userData), 'flowcopy')
  const oldDbPath = join(oldAppFolder, 'flowcopy.db')
  if (!existsSync(dbPath) && existsSync(oldDbPath)) {
    copyFileSync(oldDbPath, dbPath)
    console.log('[database] Migrated flowcopy data from old app folder → voxpilot.db')
  }
  db = new Database(dbPath)

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations(db)

  return db
}

function runMigrations(database: Database.Database): void {
  // Create migrations tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER DEFAULT (unixepoch())
    )
  `)

  const migrationsDir = join(__dirname, 'migrations')
  let migrationFiles: string[]

  try {
    migrationFiles = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
  } catch {
    // In production, migrations are bundled differently
    // Fall back to inline migrations
    migrationFiles = []
    runInlineMigrations(database)
    return
  }

  const applied = new Set(
    database
      .prepare('SELECT name FROM _migrations')
      .all()
      .map((row: any) => row.name)
  )

  for (const file of migrationFiles) {
    if (applied.has(file)) continue

    const sql = readFileSync(join(migrationsDir, file), 'utf-8')
    database.exec(sql)
    database.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file)
    console.log(`Applied migration: ${file}`)
  }
}

function runInlineMigrations(database: Database.Database): void {
  const applied = new Set(
    database
      .prepare('SELECT name FROM _migrations')
      .all()
      .map((row: any) => row.name)
  )

  const migrations: Record<string, string> = {
    '001_initial.sql': `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch())
      );
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
      CREATE TABLE IF NOT EXISTS dictionary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL UNIQUE,
        replacement TEXT,
        category TEXT DEFAULT 'general',
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS idx_dictionary_word ON dictionary(word);
    `,
    '002_snippets.sql': `
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
      CREATE TABLE IF NOT EXISTS tone_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_identifier TEXT NOT NULL UNIQUE,
        app_name TEXT NOT NULL,
        tone TEXT NOT NULL DEFAULT 'neutral',
        custom_instructions TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS idx_tone_app ON tone_profiles(app_identifier);
    `,
    '003_usage.sql': `
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
      CREATE TABLE IF NOT EXISTS usage_daily (
        date TEXT PRIMARY KEY,
        total_words INTEGER DEFAULT 0,
        total_recordings INTEGER DEFAULT 0,
        total_recording_ms INTEGER DEFAULT 0,
        total_processing_ms INTEGER DEFAULT 0,
        top_app TEXT,
        updated_at INTEGER DEFAULT (unixepoch())
      );
    `,
    '004_groq.sql': `
      INSERT OR IGNORE INTO settings (key, value) VALUES
        ('transcription_provider', 'openai'),
        ('groq_api_key', '');
    `,
    '005_api_cost.sql': `
      ALTER TABLE usage_log ADD COLUMN estimated_cost_cents REAL DEFAULT 0;
      ALTER TABLE usage_log ADD COLUMN transcription_model TEXT;
      ALTER TABLE usage_log ADD COLUMN polish_model TEXT;
      ALTER TABLE usage_daily ADD COLUMN total_cost_cents REAL DEFAULT 0;
    `,
  }

  for (const [name, sql] of Object.entries(migrations)) {
    if (applied.has(name)) continue
    database.exec(sql)
    database.prepare('INSERT INTO _migrations (name) VALUES (?)').run(name)
    console.log(`Applied inline migration: ${name}`)
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
