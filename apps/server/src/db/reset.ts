import 'dotenv/config'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import * as schema from './schema.js'

const env = process.env.NODE_ENV ?? 'development'

if (env === 'production') {
  console.error('db:reset is not allowed in production')
  process.exit(1)
}

async function reset() {
  const url =
    process.env.DATABASE_URL ?? 'postgres://wpc:wpc_dev_pass@localhost:5432/world_poker_cup'
  const pool = new pg.Pool({ connectionString: url })
  const database = drizzle(pool, { schema })

  try {
    console.log('DB Reset - dropping all tables')
    await database.execute(sql`DROP SCHEMA public CASCADE`)
    await database.execute(sql`CREATE SCHEMA public`)

    console.log('DB Reset - running migrations')
    await migrate(database, { migrationsFolder: 'src/db/migrations' })

    console.log('DB Reset - seeding teams')
    const { execSync } = await import('node:child_process')
    execSync('pnpm db:seed', { stdio: 'inherit', cwd: process.cwd() })

    console.log('DB Reset - complete')
  } catch (error) {
    console.error('DB Reset - failed', { error })
    process.exit(1)
  } finally {
    await pool.end()
  }
}

void reset()
