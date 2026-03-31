import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import type { Server } from 'socket.io'
import { z } from 'zod'
import { requireAuth, type AuthRequest } from '../auth/auth.middleware.js'
import * as tableService from './table.service.js'
import { startRound } from '../game/game.service.js'

export function createTableRouter(io: Server): Router {
  const router = Router()

  router.use(requireAuth)

  const createTableSchema = z.object({
    name: z.string().min(1, 'Table name is required').max(100),
    startingChips: z.number().int().min(100).max(10000).optional(),
    smallBlind: z.number().int().min(1).max(1000).optional(),
    bigBlind: z.number().int().min(2).max(2000).optional(),
  })

  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tables = await tableService.listTables()
      res.json({ success: true, data: { tables } })
    } catch (error) {
      next(error)
    }
  })

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest
      const data = createTableSchema.parse(req.body)
      const table = await tableService.createTable(data.name, authReq.user!.userId, {
        startingChips: data.startingChips,
        smallBlind: data.smallBlind,
        bigBlind: data.bigBlind,
      })
      res.status(201).json({ success: true, data: { table } })
    } catch (error) {
      next(error)
    }
  })

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const table = await tableService.getTable(req.params.id)
      res.json({ success: true, data: { table } })
    } catch (error) {
      next(error)
    }
  })

  router.post('/:id/join', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest
      const table = await tableService.joinTable(req.params.id, authReq.user!.userId)
      res.json({ success: true, data: { table } })
    } catch (error) {
      next(error)
    }
  })

  router.post('/:id/leave', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest
      const table = await tableService.leaveTable(req.params.id, authReq.user!.userId)
      res.json({ success: true, data: { table } })
    } catch (error) {
      next(error)
    }
  })

  router.post('/:id/add-bots', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest
      const table = await tableService.addBotsToTable(req.params.id, authReq.user!.userId)
      res.json({ success: true, data: { table } })
    } catch (error) {
      next(error)
    }
  })

  router.post('/:id/add-bot', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest
      const table = await tableService.addSingleBotToTable(req.params.id, authReq.user!.userId)
      res.json({ success: true, data: { table } })
    } catch (error) {
      next(error)
    }
  })

  router.post('/:id/start', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest
      const tableId = req.params.id
      const table = await tableService.startGame(tableId, authReq.user!.userId)
      res.json({ success: true, data: { table } })
      startRound(tableId, io).catch((err) =>
        console.error('TableController - startRound - failed', { tableId, error: err }),
      )
    } catch (error) {
      next(error)
    }
  })

  return router
}
