import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes'
import usageRoutes from './routes/usage.routes'
import dictionaryRoutes from './routes/dictionary.routes'
import { getDb } from './db/connection'

const app = express()
const PORT = process.env.PORT || 3456

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Initialize database
getDb()

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/auth', authRoutes)
app.use('/usage', usageRoutes)
app.use('/dictionary', dictionaryRoutes)

app.listen(PORT, () => {
  console.log(`FlowCopy team server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})
