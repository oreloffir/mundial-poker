/**
 * Records the Live Demo section to recordings/wpc-demo-<timestamp>.webm
 * Prereq: from this directory run `npm install` then `npx playwright install chromium`
 * Usage: npm run record   OR   node record-wpc-demo.mjs
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const outDir = path.join(projectRoot, 'recordings')
const PORT = 8877
const BASE = `http://127.0.0.1:${PORT}`

fs.mkdirSync(outDir, { recursive: true })

const server = spawn('python3', ['-m', 'http.server', String(PORT)], {
  cwd: projectRoot,
  stdio: 'ignore',
  detached: false,
})

await new Promise((r) => setTimeout(r, 900))

let browser
let context
try {
  browser = await chromium.launch({ headless: true })
  context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: {
      dir: outDir,
      size: { width: 1280, height: 800 },
    },
  })

  const page = await context.newPage()
  await page.goto(`${BASE}/index.html?demoSpeed=1.12&demoAutoplay=1#demo`, {
    waitUntil: 'domcontentloaded',
  })

  await page.waitForSelector('#demoPlayBtn', { state: 'visible', timeout: 30_000 })

  await page.waitForSelector('.demo-celebration.visible', { timeout: 120_000 })
  await page.waitForTimeout(5000)

  await context.close()
  await browser.close()
} finally {
  server.kill('SIGTERM')
}

const videos = fs
  .readdirSync(outDir)
  .filter((f) => f.endsWith('.webm'))
  .map((f) => ({ f, t: fs.statSync(path.join(outDir, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t)

if (videos.length === 0) {
  console.error('No .webm file found in recordings/')
  process.exit(1)
}

const latest = path.join(outDir, videos[0].f)
const stamped = path.join(outDir, `wpc-demo-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`)
fs.renameSync(latest, stamped)
console.log('Saved:', stamped)
