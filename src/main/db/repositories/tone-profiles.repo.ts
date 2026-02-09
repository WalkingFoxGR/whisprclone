import type Database from 'better-sqlite3'
import type { ToneProfile, ToneProfileInput } from '../../../shared/types'

export class ToneProfilesRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  getAll(): ToneProfile[] {
    return this.db
      .prepare('SELECT * FROM tone_profiles ORDER BY app_name ASC')
      .all() as ToneProfile[]
  }

  getByAppIdentifier(appIdentifier: string): ToneProfile | null {
    return (
      (this.db
        .prepare('SELECT * FROM tone_profiles WHERE app_identifier = ?')
        .get(appIdentifier) as ToneProfile | undefined) ?? null
    )
  }

  set(input: ToneProfileInput): ToneProfile {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO tone_profiles (app_identifier, app_name, tone, custom_instructions, created_at)
         VALUES (?, ?, ?, ?, unixepoch())`
      )
      .run(input.app_identifier, input.app_name, input.tone, input.custom_instructions ?? null)

    return this.getByAppIdentifier(input.app_identifier)!
  }

  remove(appIdentifier: string): void {
    this.db.prepare('DELETE FROM tone_profiles WHERE app_identifier = ?').run(appIdentifier)
  }
}
