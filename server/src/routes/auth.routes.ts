import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/connection'
import { signToken, authMiddleware, AuthRequest } from '../middleware/auth.middleware'

const router = Router()

// Register with invite code
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name, invite_code } = req.body

  if (!email || !password || !name || !invite_code) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }

  const db = getDb()

  // Validate invite code
  const code = db.prepare('SELECT * FROM invite_codes WHERE code = ?').get(invite_code) as any
  if (!code) {
    res.status(400).json({ error: 'Invalid invite code' })
    return
  }
  if (code.max_uses > 0 && code.uses >= code.max_uses) {
    res.status(400).json({ error: 'Invite code has been used too many times' })
    return
  }
  if (code.expires_at && code.expires_at < Math.floor(Date.now() / 1000)) {
    res.status(400).json({ error: 'Invite code has expired' })
    return
  }

  // Check if email already exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    res.status(400).json({ error: 'Email already registered' })
    return
  }

  const id = uuid()
  const passwordHash = await bcrypt.hash(password, 10)

  db.prepare('INSERT INTO users (id, email, name, password_hash, team_id, role) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, email, name, passwordHash, code.team_id, 'member'
  )

  // Increment invite code usage
  db.prepare('UPDATE invite_codes SET uses = uses + 1 WHERE code = ?').run(invite_code)

  const token = signToken({ id, email, team_id: code.team_id, role: 'member' })

  res.json({
    token,
    user: { id, email, name, team_id: code.team_id, role: 'member' },
  })
})

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: 'Missing email or password' })
    return
  }

  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const token = signToken({ id: user.id, email: user.email, team_id: user.team_id, role: user.role })

  const team = db.prepare('SELECT name FROM teams WHERE id = ?').get(user.team_id) as any

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      team_id: user.team_id,
      team_name: team?.name,
      role: user.role,
    },
  })
})

// Get current user
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb()
  const user = db.prepare('SELECT id, email, name, team_id, role FROM users WHERE id = ?').get(req.user!.id) as any

  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const team = db.prepare('SELECT name FROM teams WHERE id = ?').get(user.team_id) as any

  res.json({
    ...user,
    team_name: team?.name,
  })
})

// Create team (bootstrap - creates team + admin user + invite code)
router.post('/bootstrap', async (req: Request, res: Response) => {
  const { team_name, admin_email, admin_password, admin_name } = req.body

  if (!team_name || !admin_email || !admin_password || !admin_name) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }

  const db = getDb()

  const teamId = uuid()
  const userId = uuid()
  const inviteCode = uuid().split('-')[0]
  const passwordHash = await bcrypt.hash(admin_password, 10)

  const transaction = db.transaction(() => {
    db.prepare('INSERT INTO teams (id, name) VALUES (?, ?)').run(teamId, team_name)
    db.prepare('INSERT INTO users (id, email, name, password_hash, team_id, role) VALUES (?, ?, ?, ?, ?, ?)').run(
      userId, admin_email, admin_name, passwordHash, teamId, 'admin'
    )
    db.prepare('INSERT INTO invite_codes (code, team_id, created_by, max_uses) VALUES (?, ?, ?, ?)').run(
      inviteCode, teamId, userId, 50
    )
  })

  transaction()

  const token = signToken({ id: userId, email: admin_email, team_id: teamId, role: 'admin' })

  res.json({
    token,
    team: { id: teamId, name: team_name },
    user: { id: userId, email: admin_email, name: admin_name, role: 'admin' },
    invite_code: inviteCode,
  })
})

export default router
