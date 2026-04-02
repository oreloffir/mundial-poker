import { Page } from '@playwright/test'

/**
 * Navigate to /lobby and wait for the app to auto-create a guest session.
 * The app auto-logins as "Guest-XXXXX" on every /lobby visit.
 * 5s wait is required — the app needs time to render and complete guest creation.
 */
export async function guestLogin(page: Page): Promise<void> {
  await page.goto('/lobby', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(5000)
}

export async function getGuestUsername(page: Page): Promise<string | null> {
  return page.locator('nav span').first().textContent().catch(() => null)
}
