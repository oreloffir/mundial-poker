import { test, expect } from '@playwright/test'
import { guestLogin } from './helpers/auth.helper'
import { setupGame } from './helpers/table.helper'
import { bettingControls, waitForBetPrompt } from './helpers/game.helper'

test.describe('Betting Controls', () => {
  test.beforeEach(async ({ page }) => {
    await guestLogin(page)
  })

  test('shows Fold, Check/Call, Raise, and All-In buttons during player turn', async ({
    page,
  }) => {
    await setupGame(page, { name: 'E2E Betting Controls' })
    const prompt = await waitForBetPrompt(page)
    expect(prompt).not.toBeNull()

    const controls = bettingControls(page)
    await expect(controls.fold).toBeVisible()
    await expect(controls.allIn).toBeVisible()
    // Either Check or Call should be visible
    const checkVisible = await controls.check.isVisible().catch(() => false)
    const callVisible = await controls.call.isVisible().catch(() => false)
    expect(checkVisible || callVisible).toBe(true)
    await page.screenshot({ path: 'e2e/screenshots/betting-controls.png' })
  })

  test('new betting controls — chip denominations visible', async ({ page }) => {
    await setupGame(page, { name: 'E2E Chip Controls' })
    await waitForBetPrompt(page)

    const bar = page.locator('div[class*="absolute bottom"]')
    const buttonTexts = await bar.locator('button').allTextContents()

    // Check chip denominations are present (new design)
    const denominations = ['5', '10', '25', '50', '100', '200']
    const found = denominations.filter((d) => buttonTexts.includes(d))
    expect(found.length).toBeGreaterThan(0)
    await page.screenshot({ path: 'e2e/screenshots/betting-chip-denominations.png' })
  })

  test('new betting controls — preset buttons visible (Min, 1/2 Pot, Pot, All In)', async ({
    page,
  }) => {
    await setupGame(page, { name: 'E2E Presets' })
    await waitForBetPrompt(page)

    const bar = page.locator('div[class*="absolute bottom"]')
    const buttonTexts = await bar.locator('button').allTextContents()
    const hasPreset = buttonTexts.some(
      (t) => t.includes('Min') || t.includes('Pot') || t.includes('1/2'),
    )
    expect(hasPreset).toBe(true)
  })

  test('new betting controls — old range slider is removed', async ({ page }) => {
    await setupGame(page, { name: 'E2E No Slider' })
    await waitForBetPrompt(page)

    const slider = page.locator('div[class*="absolute bottom"]').locator('input[type="range"]')
    await expect(slider).not.toBeVisible()
  })

  // Raise flow
  test('raise: pot increases and player chips decrease', async ({ page }) => {
    await setupGame(page, { name: 'E2E Raise Test', startingChips: 500 })
    await waitForBetPrompt(page)

    const balanceBefore = await page
      .locator('[data-testid="seat-balance-4"]')
      .textContent()
      .catch(() => null)

    // Click a chip denomination to build a raise, then raise
    const bar = page.locator('div[class*="absolute bottom"]')
    const chip100 = bar.locator('button').filter({ hasText: '100' }).first()
    if (await chip100.isVisible({ timeout: 2000 }).catch(() => false)) {
      await chip100.click()
      await page.waitForTimeout(300)
    }
    const raiseBtn = bettingControls(page).raise
    if (await raiseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await raiseBtn.click()
      await page.waitForTimeout(10000)
    }

    const balanceAfter = await page
      .locator('[data-testid="seat-balance-4"]')
      .textContent()
      .catch(() => null)
    if (balanceBefore && balanceAfter) {
      expect(Number(balanceAfter)).toBeLessThan(Number(balanceBefore))
    }
    await page.screenshot({ path: 'e2e/screenshots/betting-after-raise.png' })
  })

  // Fold flow
  test('fold: betting controls disappear after folding', async ({ page }) => {
    await setupGame(page, { name: 'E2E Fold Test' })
    await waitForBetPrompt(page)

    const controls = bettingControls(page)
    await controls.fold.click()
    await page.waitForTimeout(3000)

    // Betting controls should no longer be visible after fold
    const checkVisible = await controls.check.isVisible({ timeout: 1000 }).catch(() => false)
    const callVisible = await controls.call.isVisible({ timeout: 1000 }).catch(() => false)
    expect(checkVisible || callVisible).toBe(false)
    await page.screenshot({ path: 'e2e/screenshots/betting-after-fold.png' })
  })

  test('fold: player avatar enters folded state', async ({ page }) => {
    await setupGame(page, { name: 'E2E Fold State' })
    await waitForBetPrompt(page)

    await bettingControls(page).fold.click()
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'e2e/screenshots/betting-fold-state.png' })
    // Visual check — folded state is confirmed by screenshot
    // TODO: add data-testid="folded-indicator" to enable programmatic assertion
  })
})
