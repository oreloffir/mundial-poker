import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import type { Server } from 'socket.io'
import { z } from 'zod'
import { seedGame, cleanupTestTables } from './test.service.js'

const seedGameSchema = z.object({
  playerCount: z.number().int().min(2).max(5),
  startingChips: z.number().int().min(100).max(10_000),
  smallBlind: z.number().int().min(1).max(1_000),
  bigBlind: z.number().int().min(2).max(2_000),
  phase: z.enum(['betting', 'waiting', 'showdown']),
})

export function createTestRouter(io: Server): Router {
  const router = Router()

  router.post('/seed-game', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = seedGameSchema.parse(req.body)
      const result = await seedGame(data, io)
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  })

  router.delete('/cleanup', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await cleanupTestTables()
      res.json({ success: true, data: { deleted: count } })
    } catch (error) {
      next(error)
    }
  })

  return router
}
