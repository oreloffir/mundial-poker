import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: 'src/db/schema.ts',
  out: 'src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://wpc:wpc_dev_pass@localhost:5432/world_poker_cup',
  },
})
