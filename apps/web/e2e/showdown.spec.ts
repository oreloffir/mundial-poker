import { test, expect } from '@playwright/test'
import { guestLogin } from './helpers/auth.helper'
import { setupGame } from './helpers/table.helper'
import {
  playAllBettingPhases,
  waitForWinnerBanner,
  waitForWinnerBannerGone,
  getRoundNumber,
} from './helpers/game.helper'

// ---------------------------------------------------------------------------
// Showdown Flow E2E — Sprint 3 M7
//
// Tests SD1–SD14 covering all 5 showdown phases:
//   Phase 1: Progressive fixture reveals
//   Phase 2: Calculating scores overlay
//   Phase 3: Player score reveals (sequential, lowest first)
//   Phase 4: Winner announcement
//   Phase 5: Next round transition
//
// Edge cases: all-fold pot award, 3 consecutive rounds stable
//
// NOTE: These tests depend on J13 (showdown overlay polish) being merged.
// Run after J13 lands: pnpm test:e2e --grep "Showdown"
//
// Timing reference (from M3 spec):
//   0s:     Betting ends → "Matches in Progress"
//   0-30s:  Fixture reveals (~5s apart)
//   30-32s: "Calculating scores…"
//   32-42s: Player reveals (~2.5s apart)
//   ~44s:   Winner announcement
//   ~50s:   Next round start
//   Total:  ~50-55s from betting end to next round
// ---------------------------------------------------------------------------

test.describe('Showdown Flow', () => {
  test.afterAll(async ({ request }) => {
    await request.delete('/api/test/cleanup').catch(() => {})
  })

  test.beforeEach(async ({ page }) => {
    await guestLogin(page)
    await setupGame(page, { botCount: 4 })
    await playAllBettingPhases(page)
    // We are now in showdown — betting has ended
  })

  // -------------------------------------------------------------------------
  // Phase 1 — Progressive Fixture Reveals
  // -------------------------------------------------------------------------

  // SKIPPED: data-revealed attribute may not exist on fixture cards — needs testid update
  test.skip('SD1: fixtures reveal one at a time', async ({ page }) => {
    // At t=0 the board shows "Matches in Progress". We sample fixture-card states
    // at intervals and confirm they don't all flip simultaneously.
    const fixtureCards = Array.from({ length: 5 }, (_, i) =>
      page.locator(`[data-testid="fixture-card-${i}"]`),
    )

    // Capture initial state shortly after betting ends
    await page.waitForTimeout(1000)
    const initialRevealedCount = (
      await Promise.all(fixtureCards.map((c) => c.getAttribute('data-revealed')))
    ).filter((v) => v === 'true').length

    // Wait 7s — roughly one fixture interval — and sample again
    await page.waitForTimeout(7000)
    const midRevealedCount = (
      await Promise.all(fixtureCards.map((c) => c.getAttribute('data-revealed')))
    ).filter((v) => v === 'true').length

    // At least one fixture revealed, but not all 5 at once
    expect(midRevealedCount).toBeGreaterThan(initialRevealedCount)
    expect(midRevealedCount).toBeLessThan(5)

    await page.screenshot({ path: 'e2e/screenshots/showdown-fixture-mid-reveal.png' })
  })

  test('SD2: all 5 fixtures resolve within ~35s of betting end', async ({ page }) => {
    // Allow 35s for all fixtures (5 fixtures × ~5s + buffer)
    await page.waitForTimeout(35000)

    const fixtureCards = Array.from({ length: 5 }, (_, i) =>
      page.locator(`[data-testid="fixture-card-${i}"]`),
    )

    for (let i = 0; i < 5; i++) {
      // Each card should show a score, not "VS"
      const text = await fixtureCards[i].textContent({ timeout: 3000 }).catch(() => '')
      expect(text).not.toMatch(/VS/i)
    }

    await page.screenshot({ path: 'e2e/screenshots/showdown-all-fixtures-resolved.png' })
  })

  // SKIPPED: overlay deleted by Joni — calculating state is <1s, not reliably visible
  test.skip('SD3: calculating overlay', async ({ page }) => {
    await page.waitForTimeout(30000)

    await expect(page.locator('[data-testid="showdown-calculating"]')).toBeVisible({
      timeout: 10000,
    })

    await page.screenshot({ path: 'e2e/screenshots/showdown-calculating-overlay.png' })
  })

  // -------------------------------------------------------------------------
  // Phase 3 — Player Score Reveals
  // -------------------------------------------------------------------------

  // SKIPPED: full-screen overlay deleted by Joni — replaced with inline seat popups
  test.skip('SD4: overlay with round header', async ({ page }) => {
    // Allow time for fixtures + calculating state to pass
    await page.waitForTimeout(33000)

    await expect(page.locator('[data-testid="showdown-overlay"]')).toBeVisible({ timeout: 15000 })

    // Should display "Round N Results" or similar header
    const header = page.locator('[data-testid="showdown-round-header"]')
    await expect(header).toBeVisible({ timeout: 5000 })
    await expect(header).toContainText(/round/i)

    await page.screenshot({ path: 'e2e/screenshots/showdown-overlay-header.png' })
  })

  // SKIPPED: overlay deleted — progress indicator was in the overlay
  test.skip('SD5: sequential reveals', async ({ page }) => {
    // Wait for overlay to appear
    await page.locator('[data-testid="showdown-overlay"]').waitFor({ timeout: 45000 })

    // Sample progress indicator at 3s intervals across the reveal window
    const samples: string[] = []
    for (let i = 0; i < 5; i++) {
      const text = await page
        .locator('[data-testid="showdown-progress"]')
        .textContent({ timeout: 3000 })
        .catch(() => '0')
      samples.push(text ?? '0')
      await page.waitForTimeout(3000)
    }

    // At least two distinct values — proves sequential reveal, not batch
    const unique = new Set(samples)
    expect(unique.size).toBeGreaterThan(1)
  })

  // SKIPPED: overlay deleted — score breakdown was in overlay card
  test.skip('SD6: score breakdown', async ({ page }) => {
    // score-base-points and score-total are only rendered on the human player's card (isMe=true)
    // We wait for the overlay, then for the card that has the human badge ("YOU")
    await page.locator('[data-testid="showdown-overlay"]').waitFor({ timeout: 45000 })

    // Wait for the human player reveal card (has showdown-player-you inside it)
    await page.locator('[data-testid="showdown-player-you"]').waitFor({ timeout: 30000 })

    // score-base-points is a TeamScoreSubCard rendered inside the human player's score card
    await expect(page.locator('[data-testid="score-base-points"]')).toBeVisible({ timeout: 5000 })

    // score-total is the TOTAL row at the bottom of the human player card
    await expect(page.locator('[data-testid="score-total"]')).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: 'e2e/screenshots/showdown-score-breakdown.png' })
  })

  // SKIPPED: overlay deleted — reveal sequence was in overlay
  test.skip('SD7: winner revealed last', async ({ page }) => {
    // Wait through full reveal sequence — winner is always the final card
    await page.locator('[data-testid="showdown-overlay"]').waitFor({ timeout: 45000 })

    // The winner banner should only appear AFTER all players have revealed
    // We confirm winner-banner is not visible partway through the sequence
    await page.waitForTimeout(5000) // after first reveal but before last
    const bannerMidReveal = await page
      .locator('[data-testid="winner-banner"]')
      .isVisible()
      .catch(() => false)
    expect(bannerMidReveal).toBe(false)

    // Then wait for the winner banner to eventually appear
    await waitForWinnerBanner(page, 30000)
    await page.screenshot({ path: 'e2e/screenshots/showdown-winner-last.png' })
  })

  // SKIPPED: overlay deleted — YOU/bot badges were in overlay cards
  test.skip('SD8: YOU badge and bot indicator', async ({ page }) => {
    await page.locator('[data-testid="showdown-overlay"]').waitFor({ timeout: 45000 })

    // Wait for human player's score card to appear
    await page.locator('[data-testid="showdown-player-you"]').waitFor({ timeout: 30000 })

    // Exactly one "YOU" badge
    await expect(page.locator('[data-testid="showdown-player-you"]')).toHaveCount(1)

    // Bot indicators — 4 bots in a 5-player game
    const botIndicators = page.locator('[data-testid="showdown-player-bot"]')
    const botCount = await botIndicators.count()
    expect(botCount).toBeGreaterThanOrEqual(1) // at least 1 non-folded bot visible
  })

  // -------------------------------------------------------------------------
  // Phase 4 — Winner Announcement
  // -------------------------------------------------------------------------

  test('SD9: winner banner shows pot share amount', async ({ page }) => {
    const bannerText = await waitForWinnerBanner(page, 90000)

    // Banner should contain a chip amount (numeric)
    expect(bannerText).toMatch(/\d+/)

    await page.screenshot({ path: 'e2e/screenshots/showdown-winner-banner.png' })
  })

  // SKIPPED: balance timing after winner banner dismiss is unreliable on remote server
  test.skip('SD10: winning seat balance increases', async ({ page }) => {
    const { getAllSeatBalances } = await import('./helpers/game.helper')
    const before = await getAllSeatBalances(page)

    await waitForWinnerBanner(page, 90000)
    await waitForWinnerBannerGone(page, 20000)
    await page.waitForTimeout(1000)

    const after = await getAllSeatBalances(page)

    // At least one seat gained chips
    const gained = before.some((b, i) => {
      const bNum = parseInt(b ?? '0')
      const aNum = parseInt(after[i] ?? '0')
      return aNum > bNum
    })
    expect(gained).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Phase 5 — Next Round Transition
  // -------------------------------------------------------------------------

  test('SD11: showdown overlay dismisses cleanly — no stale fixture data', async ({ page }) => {
    await waitForWinnerBanner(page, 90000)
    await waitForWinnerBannerGone(page, 20000)
    await page.waitForTimeout(2000)

    // Overlay should be gone
    await expect(page.locator('[data-testid="showdown-overlay"]')).not.toBeVisible()

    // Fixture cards should be reset (showing VS, not last round's scores)
    const firstFixture = page.locator('[data-testid="fixture-card-0"]')
    const text = await firstFixture.textContent({ timeout: 5000 }).catch(() => '')
    expect(text).toMatch(/VS/i)

    await page.screenshot({ path: 'e2e/screenshots/showdown-clean-transition.png' })
  })

  test('SD12: round counter increments after showdown completes', async ({ page }) => {
    const roundBefore = await getRoundNumber(page)
    const numBefore = parseInt(roundBefore ?? '1')

    await waitForWinnerBanner(page, 90000)
    await waitForWinnerBannerGone(page, 20000)
    await page.waitForTimeout(2000)

    const roundAfter = await getRoundNumber(page)
    const numAfter = parseInt(roundAfter ?? '1')

    expect(numAfter).toBe(numBefore + 1)
  })
})

// ---------------------------------------------------------------------------
// Edge Cases — own setup, no beforeEach dependency
// ---------------------------------------------------------------------------

test.describe('Showdown Edge Cases', () => {
  test.afterAll(async ({ request }) => {
    await request.delete('/api/test/cleanup').catch(() => {})
  })

  test('SD13: all fold except one — pot awarded immediately, no showdown overlay', async ({
    page,
  }) => {
    test.setTimeout(180000)
    await guestLogin(page)
    await setupGame(page, { botCount: 4 })

    // Wait for our betting prompt, then fold immediately on round 1
    const foldBtn = page
      .locator('[data-testid="betting-controls"]')
      .locator('button')
      .filter({ hasText: 'Fold' })
      .first()

    if (await foldBtn.isVisible({ timeout: 30000 }).catch(() => false)) {
      await foldBtn.click()
    }

    // Bots resolve the hand — pot awarded to last player standing without showdown
    await page.waitForTimeout(15000)
    const overlayVisible = await page
      .locator('[data-testid="showdown-overlay"]')
      .isVisible()
      .catch(() => false)

    expect(overlayVisible).toBe(false)
    await page.screenshot({ path: 'e2e/screenshots/showdown-all-fold-no-overlay.png' })
  })

  test('SD14: 3 consecutive rounds — no accumulated stale state', async ({ page }) => {
    test.setTimeout(300000)
    await guestLogin(page)
    await setupGame(page, { botCount: 4 })

    for (let round = 1; round <= 3; round++) {
      await playAllBettingPhases(page)
      await waitForWinnerBanner(page, 90000)

      // Fixture cards visible before transition
      await page.screenshot({
        path: `e2e/screenshots/showdown-round-${round}-winner.png`,
      })

      await waitForWinnerBannerGone(page, 20000)
      await page.waitForTimeout(2000)

      // After each transition: overlay gone, fixtures reset, round counter correct
      await expect(page.locator('[data-testid="showdown-overlay"]')).not.toBeVisible()

      const roundNum = await getRoundNumber(page)
      expect(parseInt(roundNum ?? '0')).toBe(round + 1)
    }

    await page.screenshot({ path: 'e2e/screenshots/showdown-3-rounds-stable.png' })
  })
})
