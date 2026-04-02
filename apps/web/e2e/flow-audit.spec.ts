/**
 * Flow Audit v2 — Sprint 3
 * Full UX walkthrough: desktop (1400x900) + mobile landscape (667x375)
 * Captures every phase A–K with v2- prefix.
 *
 * Key changes from v1:
 *   - Fixture reveals only fire AFTER round 3 (Soni's fix)
 *   - Full-screen overlay removed — score reveals are inline seat popups (Joni's fix)
 *   - Winner glow/badge on seat, not overlay
 *   - Winner banner ~10s minimum
 *
 * Run: pnpm test:e2e --grep "Flow Audit v2"
 */
import { test, Page } from '@playwright/test'

const SHOTS_DIR = '../../assets/screenshots'

async function shot(page: Page, name: string) {
  await page.screenshot({
    path: `${SHOTS_DIR}/${name}.png`,
    fullPage: false,
  })
}

// Play one betting round: screenshot it, then check or call, return whether it fired
async function playBettingRound(page: Page, prefix: string, roundLabel: string): Promise<boolean> {
  const betControls = page.locator('[data-testid="betting-controls"]')
  const visible = await betControls.isVisible({ timeout: 25000 }).catch(() => false)
  if (!visible) return false

  await shot(page, `v2-${prefix}-${roundLabel}`)

  // Verify no fixture scores have appeared yet (Soni's fix check)
  // fixture-card-0 should NOT have data-revealed="true" during betting
  const firstFixture = page.locator('[data-testid="fixture-card-0"]')
  const revealed = await firstFixture.getAttribute('data-revealed').catch(() => null)
  if (revealed === 'true') {
    // Soni's fix didn't land or fixtures fired early — capture evidence
    await shot(page, `v2-${prefix}-EARLY-FIXTURE-BUG-${roundLabel}`)
  }

  const checkBtn = betControls.locator('button').filter({ hasText: 'Check' }).first()
  const callBtn = betControls.locator('button').filter({ hasText: /Call/ }).first()
  if (await checkBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await checkBtn.click()
  } else if (await callBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await callBtn.click()
  }
  return true
}

async function runFullFlow(page: Page, prefix: 'desktop' | 'mobile') {
  // ── A. Landing Page ──────────────────────────────────────────────────────
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  await shot(page, `v2-${prefix}-A-landing`)

  // ── B. Guest Login → Lobby ───────────────────────────────────────────────
  await page.goto('/lobby', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(5000)
  await shot(page, `v2-${prefix}-B-lobby`)

  // ── C. Create Table Modal ────────────────────────────────────────────────
  await page.locator('button').filter({ hasText: 'Create Table' }).first().click()
  await page.waitForTimeout(800)
  await shot(page, `v2-${prefix}-C-modal`)

  await page.locator('input[type="text"]').first().fill(`Audit Table ${prefix}`)
  await page.waitForTimeout(300)
  await page.locator('button').filter({ hasText: /^Create$/ }).last().click()
  await page.waitForTimeout(4000)

  // ── D1. Empty Table ──────────────────────────────────────────────────────
  await shot(page, `v2-${prefix}-D1-empty-table`)

  // Add 4 bots
  for (let i = 0; i < 4; i++) {
    const addBtn = page.locator('button').filter({ hasText: '+ Add Bot' }).first()
    if (await addBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(1500)
    }
  }
  await shot(page, `v2-${prefix}-D2-with-bots`)

  // Start game
  const startBtn = page.locator('button').filter({ hasText: 'Start Game' }).first()
  if (await startBtn.isEnabled({ timeout: 5000 }).catch(() => false)) {
    await startBtn.click()
  }
  await page.waitForTimeout(4000)

  // ── E. Dealt ─────────────────────────────────────────────────────────────
  await shot(page, `v2-${prefix}-E-dealt`)

  // ── F. Three Betting Rounds — fixtures must NOT fire during these ────────
  // Round 1
  await playBettingRound(page, prefix, 'F1-betting-round1')
  await page.waitForTimeout(14000) // wait for bots to act + round to advance

  // Round 2
  await playBettingRound(page, prefix, 'F2-betting-round2')
  await page.waitForTimeout(14000)

  // Round 3
  await playBettingRound(page, prefix, 'F3-betting-round3')
  // After round 3, betting ends → fixtures start (Soni's fix)
  await page.waitForTimeout(4000)

  // ── G. Fixture Reveals — table still visible, no overlay ────────────────
  // G1: just after betting ends — "Matches in Progress" / waiting state
  await shot(page, `v2-${prefix}-G1-waiting-matches`)

  // Wait for first fixture to resolve (~5s)
  await page.waitForTimeout(8000)
  await shot(page, `v2-${prefix}-G2-fixture-reveal-mid`)

  // Wait for all 5 fixtures to resolve (~25s from betting end)
  await page.waitForTimeout(20000)
  await shot(page, `v2-${prefix}-G3-all-fixtures-revealed`)

  // ── H. Calculating Scores ────────────────────────────────────────────────
  const calculating = page.locator('[data-testid="showdown-calculating"]')
  if (await calculating.isVisible({ timeout: 8000 }).catch(() => false)) {
    await shot(page, `v2-${prefix}-H-calculating`)
  } else {
    await shot(page, `v2-${prefix}-H-calculating`)
  }

  // ── I. Inline Score Reveals — seat popups, NO full-screen overlay ────────
  // Wait for the first seat score to appear
  const firstScore = page.locator('[data-testid="showdown-score"]').first()
  if (await firstScore.isVisible({ timeout: 15000 }).catch(() => false)) {
    await shot(page, `v2-${prefix}-I1-first-score-popup`)
  } else {
    await shot(page, `v2-${prefix}-I1-first-score-popup`)
  }

  // Wait for ~3 seats to reveal
  await page.waitForTimeout(7000)
  await shot(page, `v2-${prefix}-I2-mid-reveals`)

  // Wait for all seats to reveal
  await page.waitForTimeout(7000)
  await shot(page, `v2-${prefix}-I3-all-revealed`)

  // ── J. Winner Announcement ───────────────────────────────────────────────
  const winnerBanner = page.locator('[data-testid="winner-banner"]')
  await winnerBanner.waitFor({ timeout: 20000 }).catch(() => {})
  await shot(page, `v2-${prefix}-J-winner`)

  // ── K. Next Round Transition ─────────────────────────────────────────────
  await page.waitForSelector('[data-testid="winner-banner"]', {
    state: 'hidden',
    timeout: 30000,
  }).catch(() => {})
  await page.waitForTimeout(2000)
  await shot(page, `v2-${prefix}-K-next-round`)
}

// ── Desktop pass ─────────────────────────────────────────────────────────────

test('Flow Audit v2 — Desktop 1400x900', async ({ page }) => {
  test.setTimeout(600000)
  await page.setViewportSize({ width: 1400, height: 900 })
  await runFullFlow(page, 'desktop')
})

// ── Mobile pass ──────────────────────────────────────────────────────────────

test('Flow Audit v2 — Mobile landscape 667x375', async ({ browser }) => {
  test.setTimeout(600000)
  const page = await browser.newPage({
    viewport: { width: 667, height: 375 },
  })
  await runFullFlow(page, 'mobile')
  await page.close()
})
