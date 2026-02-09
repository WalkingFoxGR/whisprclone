import type Database from 'better-sqlite3'
import type { UsageLogInput, UsageEntry, DailyUsage, UsageStats } from '../../../shared/types'
import { TYPING_WPM, VOICE_WPM } from '../../../shared/constants'

export class UsageRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  log(input: UsageLogInput): number {
    const result = this.db
      .prepare(
        `INSERT INTO usage_log (raw_text, polished_text, word_count, recording_duration_ms,
         processing_duration_ms, target_app, language_detected, tone_used, snippet_used)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.raw_text ?? null,
        input.polished_text ?? null,
        input.word_count,
        input.recording_duration_ms,
        input.processing_duration_ms ?? null,
        input.target_app ?? null,
        input.language_detected ?? null,
        input.tone_used ?? null,
        input.snippet_used ?? null
      )

    this.updateDailyAggregate(input)

    return result.lastInsertRowid as number
  }

  private updateDailyAggregate(input: UsageLogInput): void {
    const today = new Date().toISOString().split('T')[0]

    this.db
      .prepare(
        `INSERT INTO usage_daily (date, total_words, total_recordings, total_recording_ms, total_processing_ms, top_app, updated_at)
         VALUES (?, ?, 1, ?, ?, ?, unixepoch())
         ON CONFLICT(date) DO UPDATE SET
           total_words = total_words + excluded.total_words,
           total_recordings = total_recordings + 1,
           total_recording_ms = total_recording_ms + excluded.total_recording_ms,
           total_processing_ms = total_processing_ms + excluded.total_processing_ms,
           updated_at = unixepoch()`
      )
      .run(
        today,
        input.word_count,
        input.recording_duration_ms,
        input.processing_duration_ms ?? 0,
        input.target_app ?? null
      )
  }

  getStats(): UsageStats {
    const now = Math.floor(Date.now() / 1000)
    const dayAgo = now - 86400
    const weekAgo = now - 7 * 86400
    const monthAgo = now - 30 * 86400

    const todayStats = this.db
      .prepare(
        'SELECT COALESCE(SUM(word_count), 0) as words, COUNT(*) as recordings FROM usage_log WHERE created_at >= ?'
      )
      .get(dayAgo) as { words: number; recordings: number }

    const weekStats = this.db
      .prepare(
        'SELECT COALESCE(SUM(word_count), 0) as words, COUNT(*) as recordings FROM usage_log WHERE created_at >= ?'
      )
      .get(weekAgo) as { words: number; recordings: number }

    const monthStats = this.db
      .prepare(
        'SELECT COALESCE(SUM(word_count), 0) as words, COUNT(*) as recordings FROM usage_log WHERE created_at >= ?'
      )
      .get(monthAgo) as { words: number; recordings: number }

    const allTimeStats = this.db
      .prepare('SELECT COALESCE(SUM(word_count), 0) as words, COUNT(*) as recordings FROM usage_log')
      .get() as { words: number; recordings: number }

    const daily = this.db
      .prepare(
        'SELECT * FROM usage_daily WHERE date >= date(?, \'unixepoch\') ORDER BY date ASC'
      )
      .all(monthAgo) as DailyUsage[]

    const topApps = this.db
      .prepare(
        `SELECT target_app as app, COUNT(*) as count FROM usage_log
         WHERE target_app IS NOT NULL AND created_at >= ?
         GROUP BY target_app ORDER BY count DESC LIMIT 10`
      )
      .all(monthAgo) as { app: string; count: number }[]

    const calcTimeSaved = (words: number) =>
      Math.round(words * (60000 / TYPING_WPM - 60000 / VOICE_WPM))

    return {
      today: {
        words: todayStats.words,
        recordings: todayStats.recordings,
        time_saved_ms: calcTimeSaved(todayStats.words),
      },
      week: {
        words: weekStats.words,
        recordings: weekStats.recordings,
        time_saved_ms: calcTimeSaved(weekStats.words),
      },
      month: {
        words: monthStats.words,
        recordings: monthStats.recordings,
        time_saved_ms: calcTimeSaved(monthStats.words),
      },
      all_time: {
        words: allTimeStats.words,
        recordings: allTimeStats.recordings,
      },
      daily,
      top_apps: topApps,
    }
  }

  getRecentEntries(limit: number = 20): UsageEntry[] {
    return this.db
      .prepare('SELECT * FROM usage_log ORDER BY created_at DESC LIMIT ?')
      .all(limit) as UsageEntry[]
  }

  getUnsyncedEntries(): UsageEntry[] {
    return this.db
      .prepare('SELECT * FROM usage_log WHERE synced_at IS NULL ORDER BY created_at ASC')
      .all() as UsageEntry[]
  }

  markSynced(ids: number[]): void {
    const placeholders = ids.map(() => '?').join(',')
    this.db
      .prepare(`UPDATE usage_log SET synced_at = unixepoch() WHERE id IN (${placeholders})`)
      .run(...ids)
  }
}
