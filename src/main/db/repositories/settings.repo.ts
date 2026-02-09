import type Database from 'better-sqlite3'
import type { AppSettings } from '../../../shared/types'
import { DEFAULT_SETTINGS } from '../../../shared/constants'

export class SettingsRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  get(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return row?.value ?? null
  }

  set(key: string, value: string): void {
    this.db
      .prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, unixepoch())')
      .run(key, value)
  }

  getAll(): AppSettings {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as {
      key: string
      value: string
    }[]

    const settings: Record<string, any> = { ...DEFAULT_SETTINGS }
    for (const row of rows) {
      const defaultValue = (DEFAULT_SETTINGS as any)[row.key]
      if (typeof defaultValue === 'boolean') {
        settings[row.key] = row.value === 'true'
      } else if (typeof defaultValue === 'number') {
        settings[row.key] = Number(row.value)
      } else {
        settings[row.key] = row.value
      }
    }

    return settings as AppSettings
  }

  setMultiple(entries: Record<string, string | number | boolean>): void {
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, unixepoch())'
    )
    const transaction = this.db.transaction((items: [string, string][]) => {
      for (const [key, value] of items) {
        stmt.run(key, value)
      }
    })
    transaction(Object.entries(entries).map(([k, v]) => [k, String(v)]))
  }
}
