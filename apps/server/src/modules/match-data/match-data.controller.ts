import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { fixtures, teams } from '../../db/schema.js'
import { NotFoundError } from '../../shared/errors.js'

const fixtureRouter = Router()
const teamRouter = Router()

const fixtureQuerySchema = z.object({
  status: z.enum(['SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'DEMO']).optional(),
})

fixtureRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = fixtureQuerySchema.parse(req.query)

    const rows = query.status
      ? await db.select().from(fixtures).where(eq(fixtures.status, query.status))
      : await db.select().from(fixtures)

    res.json({ success: true, data: { fixtures: rows } })
  } catch (error) {
    next(error)
  }
})

fixtureRouter.get('/today', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const rows = await db
      .select()
      .from(fixtures)
      .where(
        sql`${fixtures.scheduledAt} >= ${todayStart} AND ${fixtures.scheduledAt} <= ${todayEnd}`,
      )

    res.json({ success: true, data: { fixtures: rows } })
  } catch (error) {
    next(error)
  }
})

fixtureRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [fixture] = await db
      .select()
      .from(fixtures)
      .where(eq(fixtures.id, req.params.id))
      .limit(1)
    if (!fixture) {
      throw new NotFoundError('Fixture not found')
    }

    const [homeTeam] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, fixture.homeTeamId))
      .limit(1)
    const [awayTeam] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, fixture.awayTeamId))
      .limit(1)

    res.json({
      success: true,
      data: { fixture: { ...fixture, homeTeam: homeTeam ?? null, awayTeam: awayTeam ?? null } },
    })
  } catch (error) {
    next(error)
  }
})

teamRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db.select().from(teams)
    res.json({ success: true, data: { teams: rows } })
  } catch (error) {
    next(error)
  }
})

teamRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [team] = await db.select().from(teams).where(eq(teams.id, req.params.id)).limit(1)
    if (!team) {
      throw new NotFoundError('Team not found')
    }
    res.json({ success: true, data: { team } })
  } catch (error) {
    next(error)
  }
})

const matchDataRouter = Router()
matchDataRouter.use('/fixtures', fixtureRouter)
matchDataRouter.use('/teams', teamRouter)

export { fixtureRouter, teamRouter, matchDataRouter }
