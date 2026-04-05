import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'node:http'
import { Server } from 'socket.io'
import { ZodError } from 'zod'
import { config } from './config.js'
import { connectRedis } from './lib/redis.js'
import { authRouter } from './modules/auth/auth.controller.js'
import { createTableRouter } from './modules/tables/table.controller.js'
import { matchDataRouter } from './modules/match-data/match-data.controller.js'
import { createTestRouter } from './modules/test/test.controller.js'
import { setupGameSocket } from './modules/game/game.socket.js'
import { ensureBotsExist } from './modules/game/bot.service.js'
import { cleanupStaleTables } from './modules/tables/table.service.js'
import { AppError } from './shared/errors.js'
import type { Request, Response, NextFunction } from 'express'

const app = express()

app.use(
  cors({
    origin: config.corsOrigins === true ? true : config.corsOrigins,
    credentials: true,
  }),
)
app.use(express.json())

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } })
})

app.use('/api/auth', authRouter)
app.use('/api', matchDataRouter)

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ success: false, error: message })
    return
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: err.message })
    return
  }

  console.error('App - unhandledError', { error: err })
  res.status(500).json({ success: false, error: 'Internal server error' })
})

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: config.corsOrigins === true ? true : config.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

setupGameSocket(io)
app.use('/api/tables', createTableRouter(io))

if (config.nodeEnv !== 'production') {
  app.use('/api/test', createTestRouter(io))
}

app.delete('/api/admin/cleanup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const secret = req.headers['x-admin-secret']
    if (secret !== config.adminSecret) {
      res.status(403).json({ success: false, error: 'Forbidden' })
      return
    }
    await cleanupStaleTables()
    res.json({ success: true, data: { message: 'Stale tables cleaned up' } })
  } catch (error) {
    next(error)
  }
})

async function start(): Promise<void> {
  await connectRedis()

  server.listen(config.port, () => {
    ensureBotsExist().catch((err) =>
      console.error('App - ensureBotsExist - failed', { error: err }),
    )
  })
}

start().catch((err) => {
  console.error('App - startFailed', { error: err })
  process.exit(1)
})

export { app, server, io }
