import { createClient } from 'redis'
import { config } from '../config.js'

type RedisClient = ReturnType<typeof createClient>

let redis: RedisClient | null = null
let isConnected = false

export function getRedisClient(): RedisClient | null {
  return isConnected ? redis : null
}

export async function connectRedis(): Promise<void> {
  try {
    redis = createClient({ url: config.redisUrl })

    redis.on('error', (err) => {
      console.error('Redis - connectionError', { error: err })
      isConnected = false
    })

    redis.on('reconnecting', () => {
      console.log('Redis - reconnecting')
    })

    redis.on('ready', () => {
      isConnected = true
    })

    await redis.connect()
    isConnected = true
    console.log('Redis - connected', { url: config.redisUrl })
  } catch (err) {
    console.error('Redis - connectFailed - falling back to in-memory', { error: err })
    redis = null
    isConnected = false
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis && isConnected) {
    await redis.quit()
    isConnected = false
    console.log('Redis - disconnected')
  }
}
