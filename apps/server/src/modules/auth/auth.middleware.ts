import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from './auth.service.js'
import { UnauthorizedError } from '../../shared/errors.js'

export interface AuthRequest extends Request {
  readonly user?: { readonly userId: string; readonly email: string }
}

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  try {
    const token = extractBearerToken(req.headers.authorization)
    if (!token) {
      throw new UnauthorizedError('No token provided')
    }

    const payload = verifyToken(token)
    ;(req as unknown as Record<string, unknown>).user = payload
    next()
  } catch (error) {
    next(error)
  }
}
