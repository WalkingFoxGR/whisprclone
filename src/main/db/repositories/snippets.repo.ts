import type Database from 'better-sqlite3'
import type { Snippet, SnippetInput } from '../../../shared/types'

export class SnippetsRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  getAll(): Snippet[] {
    return this.db
      .prepare('SELECT * FROM snippets ORDER BY trigger_phrase ASC')
      .all() as Snippet[]
  }

  add(input: SnippetInput): Snippet {
    const result = this.db
      .prepare('INSERT INTO snippets (trigger_phrase, expansion, category) VALUES (?, ?, ?)')
      .run(input.trigger_phrase, input.expansion, input.category ?? 'general')

    return this.db
      .prepare('SELECT * FROM snippets WHERE id = ?')
      .get(result.lastInsertRowid) as Snippet
  }

  update(id: number, input: Partial<SnippetInput>): void {
    const fields: string[] = ['updated_at = unixepoch()']
    const values: any[] = []

    if (input.trigger_phrase !== undefined) {
      fields.push('trigger_phrase = ?')
      values.push(input.trigger_phrase)
    }
    if (input.expansion !== undefined) {
      fields.push('expansion = ?')
      values.push(input.expansion)
    }
    if (input.category !== undefined) {
      fields.push('category = ?')
      values.push(input.category)
    }

    values.push(id)
    this.db.prepare(`UPDATE snippets SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }

  remove(id: number): void {
    this.db.prepare('DELETE FROM snippets WHERE id = ?').run(id)
  }

  incrementUseCount(id: number): void {
    this.db
      .prepare('UPDATE snippets SET use_count = use_count + 1, updated_at = unixepoch() WHERE id = ?')
      .run(id)
  }

  findMatchingSnippet(text: string): Snippet | null {
    const lowerText = text.toLowerCase()
    const snippets = this.getAll()

    for (const snippet of snippets) {
      if (lowerText.includes(snippet.trigger_phrase.toLowerCase())) {
        return snippet
      }
    }

    return null
  }
}
