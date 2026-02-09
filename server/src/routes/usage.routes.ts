import { Router, Response } from 'express'
import { getDb } from '../db/connection'
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware'

const router = Router()

// Sync usage data from desktop client
router.post('/sync', authMiddleware, (req: AuthRequest, res: Response) => {
  const { entries } = req.body

  if (!Array.isArray(entries)) {
    res.status(400).json({ error: 'entries must be an array' })
    return
  }

  const db = getDb()
  const stmt = db.prepare(
    `INSERT INTO team_usage (user_id, word_count, recording_duration_ms, processing_duration_ms, target_app, language_detected, tone_used, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const transaction = db.transaction((items: any[]) => {
    for (const entry of items) {
      stmt.run(
        req.user!.id,
        entry.word_count,
        entry.recording_duration_ms,
        entry.processing_duration_ms || null,
        entry.target_app || null,
        entry.language_detected || null,
        entry.tone_used || null,
        entry.recorded_at || Math.floor(Date.now() / 1000)
      )
    }
  })

  transaction(entries)

  res.json({ synced: entries.length })
})

// Get team stats
router.get('/team-stats', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb()
  const teamId = req.user!.team_id

  const now = Math.floor(Date.now() / 1000)
  const weekAgo = now - 7 * 86400
  const monthAgo = now - 30 * 86400

  // Team totals
  const weekStats = db.prepare(
    `SELECT COALESCE(SUM(word_count), 0) as words, COUNT(*) as recordings
     FROM team_usage u JOIN users usr ON u.user_id = usr.id
     WHERE usr.team_id = ? AND u.recorded_at >= ?`
  ).get(teamId, weekAgo) as any

  const monthStats = db.prepare(
    `SELECT COALESCE(SUM(word_count), 0) as words, COUNT(*) as recordings
     FROM team_usage u JOIN users usr ON u.user_id = usr.id
     WHERE usr.team_id = ? AND u.recorded_at >= ?`
  ).get(teamId, monthAgo) as any

  // Per-member stats (this month)
  const memberStats = db.prepare(
    `SELECT usr.name, usr.email, COALESCE(SUM(u.word_count), 0) as words, COUNT(u.id) as recordings
     FROM users usr LEFT JOIN team_usage u ON usr.id = u.user_id AND u.recorded_at >= ?
     WHERE usr.team_id = ?
     GROUP BY usr.id
     ORDER BY words DESC`
  ).all(monthAgo, teamId)

  // Top apps
  const topApps = db.prepare(
    `SELECT u.target_app as app, COUNT(*) as count
     FROM team_usage u JOIN users usr ON u.user_id = usr.id
     WHERE usr.team_id = ? AND u.recorded_at >= ? AND u.target_app IS NOT NULL
     GROUP BY u.target_app ORDER BY count DESC LIMIT 10`
  ).all(teamId, monthAgo)

  // Team member count
  const memberCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE team_id = ?').get(teamId) as any

  res.json({
    week: weekStats,
    month: monthStats,
    members: memberStats,
    top_apps: topApps,
    member_count: memberCount.count,
  })
})

export default router
