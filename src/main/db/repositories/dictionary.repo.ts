import type Database from 'better-sqlite3'
import type { DictionaryEntry, DictionaryInput } from '../../../shared/types'

export class DictionaryRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  getAll(): DictionaryEntry[] {
    return this.db.prepare('SELECT * FROM dictionary ORDER BY word ASC').all() as DictionaryEntry[]
  }

  add(input: DictionaryInput): DictionaryEntry {
    const result = this.db
      .prepare('INSERT INTO dictionary (word, replacement, category) VALUES (?, ?, ?)')
      .run(input.word, input.replacement ?? null, input.category ?? 'general')

    return this.db
      .prepare('SELECT * FROM dictionary WHERE id = ?')
      .get(result.lastInsertRowid) as DictionaryEntry
  }

  update(id: number, input: Partial<DictionaryInput>): void {
    const fields: string[] = []
    const values: any[] = []

    if (input.word !== undefined) {
      fields.push('word = ?')
      values.push(input.word)
    }
    if (input.replacement !== undefined) {
      fields.push('replacement = ?')
      values.push(input.replacement)
    }
    if (input.category !== undefined) {
      fields.push('category = ?')
      values.push(input.category)
    }

    if (fields.length === 0) return

    values.push(id)
    this.db.prepare(`UPDATE dictionary SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }

  remove(id: number): void {
    this.db.prepare('DELETE FROM dictionary WHERE id = ?').run(id)
  }

  search(query: string): DictionaryEntry[] {
    return this.db
      .prepare('SELECT * FROM dictionary WHERE word LIKE ? ORDER BY word ASC')
      .all(`%${query}%`) as DictionaryEntry[]
  }

  getWordsForPrompt(): string[] {
    const rows = this.db
      .prepare('SELECT word, replacement FROM dictionary ORDER BY word ASC')
      .all() as { word: string; replacement: string | null }[]

    return rows.map((r) => (r.replacement ? `${r.word} (spelled as: ${r.replacement})` : r.word))
  }
}
