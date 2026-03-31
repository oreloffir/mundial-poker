import { randomBytes, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { users } from '../../db/schema.js'
import { UnauthorizedError, ValidationError } from '../../shared/errors.js'
import type { RegisterInput, LoginInput } from './auth.schema.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'wpc-dev-secret-change-in-production'
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'
const BCRYPT_ROUNDS = 12

interface TokenPayload {
  readonly userId: string
  readonly email: string
}

interface Tokens {
  readonly accessToken: string
  readonly refreshToken: string
}

interface SafeUser {
  readonly id: string
  readonly email: string
  readonly username: string
  readonly avatarUrl: string | null
  readonly totalChipsWon: number
  readonly gamesPlayed: number
  readonly gamesWon: number
  readonly createdAt: Date
}

function toSafeUser(user: typeof users.$inferSelect): SafeUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
    totalChipsWon: user.totalChipsWon,
    gamesPlayed: user.gamesPlayed,
    gamesWon: user.gamesWon,
    createdAt: user.createdAt,
  }
}

function generateTokens(user: { readonly id: string; readonly email: string }): Tokens {
  const payload: TokenPayload = { userId: user.id, email: user.email }

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })
  const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  })

  return { accessToken, refreshToken }
}

const GUEST_EMAIL_HOST = 'guest.wpc'

function randomGuestUsername(): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const buf = randomBytes(8)
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[buf[i]! % alphabet.length]!
  }
  return `Guest-${suffix}`
}

/** Creates a real user row with random guest email/username (no password login). */
export async function createGuest(): Promise<{ readonly user: SafeUser; readonly tokens: Tokens }> {
  const maxAttempts = 10
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const email = `guest-${randomUUID()}@${GUEST_EMAIL_HOST}`
    const username = randomGuestUsername()
    const passwordHash = await bcrypt.hash(randomUUID() + randomUUID(), BCRYPT_ROUNDS)
    try {
      const [inserted] = await db
        .insert(users)
        .values({
          email,
          username,
          passwordHash,
        })
        .returning()

      const tokens = generateTokens({ id: inserted.id, email: inserted.email })
      return { user: toSafeUser(inserted), tokens }
    } catch (err: unknown) {
      const codeFrom = (e: unknown): string => {
        if (!e || typeof e !== 'object') return ''
        if ('code' in e) return String((e as { code: unknown }).code)
        if ('cause' in e && e.cause && typeof e.cause === 'object' && 'code' in e.cause) {
          return String((e.cause as { code: unknown }).code)
        }
        return ''
      }
      const code = codeFrom(err)
      if (code === '23505' && attempt < maxAttempts - 1) {
        continue
      }
      throw err
    }
  }
  throw new Error('Could not create guest user')
}

export async function register(
  data: RegisterInput,
): Promise<{ readonly user: SafeUser; readonly tokens: Tokens }> {
  const existingEmail = await db.select().from(users).where(eq(users.email, data.email)).limit(1)
  if (existingEmail.length > 0) {
    throw new ValidationError('Email already registered')
  }

  const existingUsername = await db
    .select()
    .from(users)
    .where(eq(users.username, data.username))
    .limit(1)
  if (existingUsername.length > 0) {
    throw new ValidationError('Username already taken')
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS)

  const [inserted] = await db
    .insert(users)
    .values({
      email: data.email,
      username: data.username,
      passwordHash,
    })
    .returning()

  const tokens = generateTokens({ id: inserted.id, email: inserted.email })

  return { user: toSafeUser(inserted), tokens }
}

export async function login(
  data: LoginInput,
): Promise<{ readonly user: SafeUser; readonly tokens: Tokens }> {
  const [found] = await db.select().from(users).where(eq(users.email, data.email)).limit(1)
  if (!found) {
    throw new UnauthorizedError('Invalid email or password')
  }

  const passwordMatch = await bcrypt.compare(data.password, found.passwordHash)
  if (!passwordMatch) {
    throw new UnauthorizedError('Invalid email or password')
  }

  const tokens = generateTokens({ id: found.id, email: found.email })

  return { user: toSafeUser(found), tokens }
}

export function verifyToken(token: string): TokenPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload
    return { userId: payload.userId, email: payload.email }
  } catch {
    throw new UnauthorizedError('Invalid or expired token')
  }
}

export async function getUserById(id: string): Promise<SafeUser | null> {
  const [found] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!found) return null
  return toSafeUser(found)
}
