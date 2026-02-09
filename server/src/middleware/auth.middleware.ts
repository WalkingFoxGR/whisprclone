import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'flowcopy-dev-secret-change-in-production'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    team_id: string
    role: string
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string
      email: string
      team_id: string
      role: string
    }
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function signToken(payload: { id: string; email: string; team_id: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' })
}
