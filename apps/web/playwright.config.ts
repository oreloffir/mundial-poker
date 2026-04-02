import { defineConfig, devices } from '@playwright/test'

/**
 * Mundial Poker — Playwright E2E Configuration
 *
 * IMPORTANT: This app uses domcontentloaded, NOT networkidle.
 * networkidle times out because the Socket.io connection keeps the
 * network active indefinitely. All navigation uses domcontentloaded
 * + explicit waits for DOM signals.
 *
 * Prerequisites before running:
 *   pnpm dev:web     → http://localhost:5173
 *   pnpm dev:server  → http://localhost:5174
 *   Docker           → PostgreSQL + Redis
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 10_000 },

  // Game state is shared via a real DB — run tests sequentially to avoid interference
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  reporter: [['html', { outputFolder: 'e2e/report' }], ['list']],

  use: {
    baseURL: 'http://localhost:5173',

    // Never use networkidle — use domcontentloaded + explicit waits
    waitUntil: 'domcontentloaded',

    // Capture on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    viewport: { width: 1440, height: 900 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
