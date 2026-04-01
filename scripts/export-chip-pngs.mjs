/**
 * export-chip-pngs.mjs
 * Renders assets/chip.svg at 64×64, 32×32, and 16×16 and saves PNGs to
 * apps/web/public/images/.
 *
 * Usage:
 *   cd scripts
 *   node export-chip-pngs.mjs
 */

import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const svgPath = resolve(root, 'assets', 'chip.svg')
const outDir = resolve(root, 'apps', 'web', 'public', 'images')

const SIZES = [64, 32, 16]

const svgContent = readFileSync(svgPath, 'utf8')

const html = (size) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
    svg { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>${svgContent}</body>
</html>`

const browser = await chromium.launch()
const context = await browser.newContext({ deviceScaleFactor: 1 })

for (const size of SIZES) {
  const page = await context.newPage()
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(html(size), { waitUntil: 'networkidle' })

  const buffer = await page.screenshot({ type: 'png', omitBackground: true })
  const outPath = resolve(outDir, `chip-${size}.png`)
  writeFileSync(outPath, buffer)
  console.log(`✓ ${outPath} (${size}×${size})`)

  await page.close()
}

await browser.close()
console.log('\nAll chip PNGs exported.')
