import { Router, Response } from 'express'
import { getDb } from '../db/connection'
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware'

const router = Router()

// Get shared dictionary for team
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb()
  const entries = db.prepare(
    `SELECT sd.*, u.name as added_by_name
     FROM shared_dictionary sd JOIN users u ON sd.added_by = u.id
     WHERE sd.team_id = ? ORDER BY sd.word ASC`
  ).all(req.user!.team_id)

  res.json(entries)
})

// Add word to shared dictionary
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { word, replacement, category } = req.body

  if (!word) {
    res.status(400).json({ error: 'word is required' })
    return
  }

  const db = getDb()

  try {
    const result = db.prepare(
      'INSERT INTO shared_dictionary (team_id, word, replacement, category, added_by) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user!.team_id, word, replacement || null, category || 'general', req.user!.id)

    const entry = db.prepare('SELECT * FROM shared_dictionary WHERE id = ?').get(result.lastInsertRowid)
    res.json(entry)
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      res.status(409).json({ error: 'Word already exists in shared dictionary' })
    } else {
      res.status(500).json({ error: err.message })
    }
  }
})

// Remove word from shared dictionary (admin only)
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  const db = getDb()
  db.prepare('DELETE FROM shared_dictionary WHERE id = ? AND team_id = ?').run(
    req.params.id, req.user!.team_id
  )

  res.json({ success: true })
})

export default router
