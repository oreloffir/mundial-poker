import { test, expect } from '@playwright/test'
import { guestLogin, getGuestUsername } from './helpers/auth.helper'

test.describe('Guest Authentication', () => {
  test('auto-creates a guest session on /lobby visit', async ({ page }) => {
    await guestLogin(page)
    expect(page.url()).toContain('/lobby')
    await page.screenshot({ path: 'e2e/screenshots/auth-lobby.png' })
  })

  test('shows MUNDIAL POKER in nav', async ({ page }) => {
    await guestLogin(page)
    const navText = await page.locator('nav').textContent()
    expect(navText).toContain('MUNDIAL')
  })

  test('guest session persists across navigation', async ({ page }) => {
    await guestLogin(page)
    // Navigate away and back
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await page.goto('/lobby', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    expect(page.url()).toContain('/lobby')
  })
})
