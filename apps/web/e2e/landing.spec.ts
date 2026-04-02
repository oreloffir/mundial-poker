import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
  })

  test('displays MUNDIAL POKER branding', async ({ page }) => {
    const title = await page.locator('h1').textContent()
    expect(title).toContain('MUNDIAL')
    expect(title).toContain('POKER')
    await page.screenshot({ path: 'e2e/screenshots/landing-branding.png' })
  })

  test('displays FIFA World Cup 2026 badge', async ({ page }) => {
    const badge = page.locator('text=/FIFA.*2026|World Cup.*2026/i').first()
    await expect(badge).toBeVisible()
  })

  test('displays Play Now and View Tables buttons', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: 'Play Now' }).first()).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'View Tables' }).first()).toBeVisible()
  })

  test('Play Now navigates to /lobby', async ({ page }) => {
    await page.locator('button').filter({ hasText: 'Play Now' }).first().click()
    await page.waitForTimeout(5000)
    expect(page.url()).toContain('/lobby')
    await page.screenshot({ path: 'e2e/screenshots/landing-play-now.png' })
  })

  test('View Tables navigates to /lobby', async ({ page }) => {
    await page.locator('button').filter({ hasText: 'View Tables' }).first().click()
    await page.waitForTimeout(5000)
    expect(page.url()).toContain('/lobby')
  })
})
