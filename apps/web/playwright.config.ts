import { defineConfig, devices } from '@playwright/test'

/**
 * Mundial Poker — Playwright E2E Configuration
 *
 * IMPORTANT: This app uses domcontentloaded, NOT networkidle.
 * networkidle times out because the Socket.io connection keeps the
 * network active indefinitely. All navigation uses domcontentloaded
 * + explicit waits for DOM signals.
 *
 * Prerequisites for local run:
 *   pnpm dev:web     → http://localhost:5173
 *   pnpm dev:server  → http://localhost:5174
 *   Docker           → PostgreSQL + Redis
 *
 * Running against deployed dev server:
 *   DEV_URL=http://<ec2-ip> pnpm test:e2e
 *
 * When DEV_URL is set, all tests target the deployed URL.
 * The deployed server serves both frontend and API from the same origin.
 */

// DEV_URL overrides localhost when running against a deployed environment
const baseURL = process.env.DEV_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',
  // Increase timeout for remote server (cold-start latency on first game setup)
  timeout: baseURL.includes('localhost') ? 120_000 : 180_000,
  expect: { timeout: 10_000 },

  // Game state is shared via a real DB — run tests sequentially to avoid interference
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 1,

  reporter: [['html', { outputFolder: 'e2e/report' }], ['list']],

  use: {
    baseURL,

    // Accept self-signed certs on dev server
    ignoreHTTPSErrors: !!process.env.DEV_URL,

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
