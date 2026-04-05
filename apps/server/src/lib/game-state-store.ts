import { getRedisClient } from './redis.js'

const TTL_SECONDS = 7200 // 2 hours

// ─── In-memory fallback Maps ─────────────────────────────────────────────────

const fallbackMaps = new Map<string, Map<string, string>>()

function getFallbackMap(prefix: string): Map<string, string> {
  let map = fallbackMaps.get(prefix)
  if (!map) {
    map = new Map()
    fallbackMaps.set(prefix, map)
  }
  return map
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function stateGet<T>(prefix: string, key: string): Promise<T | undefined> {
  const redisKey = `${prefix}:${key}`
  const redis = getRedisClient()

  if (redis) {
    const raw = await redis.get(redisKey)
    return raw ? (JSON.parse(raw) as T) : undefined
  }

  const raw = getFallbackMap(prefix).get(key)
  return raw ? (JSON.parse(raw) as T) : undefined
}

export async function stateSet<T>(prefix: string, key: string, value: T, ttlSeconds?: number): Promise<void> {
  const redisKey = `${prefix}:${key}`
  const serialized = JSON.stringify(value)
  const redis = getRedisClient()

  if (redis) {
    await redis.set(redisKey, serialized, { EX: ttlSeconds ?? TTL_SECONDS })
    return
  }

  getFallbackMap(prefix).set(key, serialized)
}

export async function stateKeys(prefix: string): Promise<readonly string[]> {
  const redis = getRedisClient()

  if (redis) {
    const keys = await redis.keys(`${prefix}:*`)
    return keys.map((k) => k.slice(prefix.length + 1))
  }

  return [...getFallbackMap(prefix).keys()]
}

export async function stateDel(prefix: string, key: string): Promise<void> {
  const redisKey = `${prefix}:${key}`
  const redis = getRedisClient()

  if (redis) {
    await redis.del(redisKey)
    return
  }

  getFallbackMap(prefix).delete(key)
}
