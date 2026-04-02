export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://wpc:wpc_dev_pass@localhost:5432/world_poker_cup',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  nodeEnv: (process.env.NODE_ENV ?? 'development') as 'development' | 'production' | 'test',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3000').split(','),
} as const
