import { test, expect } from '@playwright/test'
import { guestLogin } from './helpers/auth.helper'
import { setupGame } from './helpers/table.helper'
import { waitForBetPrompt } from './helpers/game.helper'

test.describe('Mobile Responsive Layout', () => {
  let gameUrl: string

  // Set up one shared game URL for all mobile viewport tests
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await guestLogin(page)
    gameUrl = await setupGame(page, { name: 'E2E Mobile Test' })
    await page.close()
  })

  test('iPhone SE landscape (667x375) — no horizontal overflow', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 667, height: 375 } })
    await page.goto(gameUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    await page.screenshot({ path: 'e2e/screenshots/mobile-iphoneSE-landscape.png' })
    await page.close()
  })

  test('iPhone 12 landscape (844x390) — no horizontal overflow', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } })
    await page.goto(gameUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    await page.screenshot({ path: 'e2e/screenshots/mobile-iphone12-landscape.png' })
    await page.close()
  })

  test('portrait mode shows rotate-device hint', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 375, height: 667 } })
    await page.goto(gameUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    // Rotation hint should be visible in portrait
    const hint = page.locator('text=/rotate/i, text=/landscape/i, text=/turn your device/i').first()
    await expect(hint).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/mobile-portrait-hint.png' })
    await page.close()
  })

  test('desktop 1440x900 — layout intact', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto(gameUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    await page.screenshot({ path: 'e2e/screenshots/mobile-desktop-1440.png' })
    await page.close()
  })

  test('iPhone SE landscape — betting bar is reachable during active turn', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 667, height: 375 } })
    await guestLogin(page)
    await setupGame(page, { name: 'E2E Mobile Betting' })

    const prompt = await waitForBetPrompt(page, 15000)
    if (prompt !== null) {
      const foldBtn = page
        .locator('div[class*="absolute bottom"]')
        .locator('button')
        .filter({ hasText: 'Fold' })
        .first()
      const box = await foldBtn.boundingBox()
      // Button must be within viewport (width=667)
      expect(box).not.toBeNull()
      expect(box!.x + box!.width).toBeLessThanOrEqual(667)
      expect(box!.y + box!.height).toBeLessThanOrEqual(375)
      await page.screenshot({ path: 'e2e/screenshots/mobile-iphoneSE-betting.png' })
    }
    await page.close()
  })
})
