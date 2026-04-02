import { Page } from '@playwright/test'

/** Selector for the bottom floating betting controls bar */
export const BOTTOM_BAR = 'div[class*="absolute bottom"]'

/**
 * Scoped locators for betting action buttons.
 * Always scoped to the bottom bar to avoid matching action badge text on the table.
 */
export function bettingControls(page: Page) {
  const bar = page.locator(BOTTOM_BAR)
  return {
    check: bar.locator('button').filter({ hasText: 'Check' }).first(),
    call: bar.locator('button').filter({ hasText: /Call/ }).first(),
    fold: bar.locator('button').filter({ hasText: 'Fold' }).first(),
    raise: bar.locator('button').filter({ hasText: /Raise/ }).first(),
    allIn: bar
      .locator('button')
      .filter({ hasText: /All.?In/i })
      .first(),
  }
}

/**
 * Wait until a Check or Call button is visible, up to timeoutMs.
 * Returns which was found, or null if neither appeared.
 */
export async function waitForBetPrompt(
  page: Page,
  timeoutMs = 15000,
): Promise<'check' | 'call' | null> {
  const controls = bettingControls(page)
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await controls.check.isVisible({ timeout: 500 }).catch(() => false)) return 'check'
    if (await controls.call.isVisible({ timeout: 500 }).catch(() => false)) return 'call'
    await page.waitForTimeout(500)
  }
  return null
}

/**
 * Wait for a bet prompt and act: Check if available, otherwise Call.
 */
export async function actOnPrompt(page: Page, timeoutMs = 15000): Promise<void> {
  const prompt = await waitForBetPrompt(page, timeoutMs)
  const controls = bettingControls(page)
  if (prompt === 'check') {
    await controls.check.click()
  } else if (prompt === 'call') {
    await controls.call.click()
  }
}

/**
 * Act on prompt then wait for bots to finish acting (12s).
 */
export async function playBettingPhase(page: Page): Promise<void> {
  await actOnPrompt(page)
  await page.waitForTimeout(12000)
}

/**
 * Play through all 3 betting phases of a round (pre-flop, flop, turn).
 */
export async function playAllBettingPhases(page: Page): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await playBettingPhase(page)
  }
}

/**
 * Wait for the winner banner to appear. Returns banner text.
 */
export async function waitForWinnerBanner(page: Page, timeoutMs = 60000): Promise<string> {
  await page.waitForSelector('[data-testid="winner-banner"]', { timeout: timeoutMs })
  return page
    .locator('[data-testid="winner-banner"]')
    .textContent()
    .then((t) => t ?? '')
}

/**
 * Wait for the winner banner to disappear.
 */
export async function waitForWinnerBannerGone(page: Page, timeoutMs = 20000): Promise<void> {
  await page.waitForSelector('[data-testid="winner-banner"]', {
    state: 'hidden',
    timeout: timeoutMs,
  })
}

/**
 * Play a complete round from start to winner banner dismissed.
 * Returns the winner banner text.
 */
export async function playFullRound(page: Page): Promise<string> {
  await playAllBettingPhases(page)
  const winner = await waitForWinnerBanner(page)
  await waitForWinnerBannerGone(page)
  await page.waitForTimeout(1000)
  return winner
}

/**
 * Get the current round number from the data-testid.
 */
export async function getRoundNumber(page: Page): Promise<string | null> {
  return page
    .locator('[data-testid="round-counter"]')
    .textContent()
    .catch(() => null)
}

/**
 * Get chip balance for a seat by index (0–4).
 */
export async function getSeatBalance(page: Page, seatIndex: number): Promise<string | null> {
  return page
    .locator(`[data-testid="seat-balance-${seatIndex}"]`)
    .textContent()
    .catch(() => null)
}

/**
 * Get all 5 seat balances.
 */
export async function getAllSeatBalances(page: Page): Promise<(string | null)[]> {
  return Promise.all(Array.from({ length: 5 }, (_, i) => getSeatBalance(page, i)))
}
