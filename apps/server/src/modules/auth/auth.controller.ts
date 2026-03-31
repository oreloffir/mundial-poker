import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { registerSchema, loginSchema } from './auth.schema.js'
import * as authService from './auth.service.js'
import { requireAuth, type AuthRequest } from './auth.middleware.js'
import { NotFoundError } from '../../shared/errors.js'

const router = Router()

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body)
    const result = await authService.register(data)
    res.status(201).json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body)
    const result = await authService.login(data)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

router.post('/guest', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.createGuest()
    res.status(201).json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest
    const userId = authReq.user?.userId
    if (!userId) {
      throw new NotFoundError('User not found')
    }

    const user = await authService.getUserById(userId)
    if (!user) {
      throw new NotFoundError('User not found')
    }

    res.json({ success: true, data: { user } })
  } catch (error) {
    next(error)
  }
})

export const authRouter = router
