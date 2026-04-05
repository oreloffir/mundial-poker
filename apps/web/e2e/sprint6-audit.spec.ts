/**
 * Sprint 6 Final Mobile Audit — 667x375
 * Captures every Sprint 6 change across 3 full rounds.
 *
 * Run: DEV_URL=https://mundialpoker.duckdns.org pnpm test:e2e --grep "Sprint 6"
 */
import { test, Page } from '@playwright/test'

const SHOTS = '../../assets/screenshots/sprint6'

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${SHOTS}/sprint6-final-${name}.png`, fullPage: false })
}

async function actOnTurn(page: Page): Promise<boolean> {
  const bar = page.locator('[data-testid="betting-controls"]')
  if (!(await bar.isVisible({ timeout: 1000 }).catch(() => false))) {
    const checkBtn = page.locator('button').filter({ hasText: /Check/i }).first()
    const callBtn = page.locator('button').filter({ hasText: /Call/i }).first()
    if (await checkBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await checkBtn.click()
      return true
    }
    if (await callBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await callBtn.click()
      return true
    }
    return false
  }
  const checkBtn = bar.locator('button').filter({ hasText: /Check/i }).first()
  const callBtn = bar.locator('button').filter({ hasText: /Call/i }).first()
  if (await checkBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await checkBtn.click()
    return true
  }
  if (await callBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await callBtn.click()
    return true
  }
  return false
}

async function waitAndAct(page: Page, timeoutMs = 30000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await actOnTurn(page)) return
    await page.waitForTimeout(800)
  }
}

test('Sprint 6 Final Mobile Audit — 3 rounds', async ({ browser }) => {
  test.setTimeout(600000)

  const ctx = await browser.newContext({
    viewport: { width: 667, height: 375 },
    ignoreHTTPSErrors: true,
  })
  const page = await ctx.newPage()

  try {
    // ── Setup ───────────────────────────────────────────────────
    await page.goto('/lobby', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)
    await shot(page, 'A-lobby')

    await page.locator('button').filter({ hasText: 'Create Table' }).first().click()
    await page.waitForTimeout(1000)
    await page.locator('input[type="text"]').first().fill('Sprint 6 Audit')
    await page.locator('button').filter({ hasText: /^Create$/ }).last().click()
    await page.waitForTimeout(5000)
    await shot(page, 'B-table-empty')

    for (let i = 0; i < 4; i++) {
      const btn = page.locator('button').filter({ hasText: '+ Add Bot' }).first()
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click()
        await page.waitForTimeout(1500)
      }
    }
    await shot(page, 'C-table-with-bots')

    const startBtn = page.locator('button').filter({ hasText: 'Start Game' }).first()
    if (await startBtn.isEnabled({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click()
    }
    await page.waitForTimeout(6000)

    // ── ROUND 1 ─────────────────────────────────────────────────
    await shot(page, 'R1-01-dealt')

    // Check: fixture board during betting (matchups visible, no scores)
    await shot(page, 'R1-02-fixture-board-during-betting')

    // Check: corner circle buttons
    const foldBtn = page.locator('button').filter({ hasText: /Fold/i }).first()
    const raiseBtn = page.locator('button').filter({ hasText: /Raise/i }).first()
    const hasFold = await foldBtn.isVisible({ timeout: 3000 }).catch(() => false)
    const hasRaise = await raiseBtn.isVisible({ timeout: 2000 }).catch(() => false)
    console.log('R1 buttons: Fold=' + hasFold + ' Raise=' + hasRaise)

    // Check: scoring reference card (bottom-left)
    await shot(page, 'R1-03-scoring-reference')

    // Betting round 1
    await waitAndAct(page)
    await page.waitForTimeout(10000)
    await shot(page, 'R1-04-after-bet1')

    // Betting round 2
    await waitAndAct(page)
    await page.waitForTimeout(10000)

    // Betting round 3
    await waitAndAct(page)
    await page.waitForTimeout(4000)
    await shot(page, 'R1-05-betting-complete')

    // Check: chip pile in pot center
    await shot(page, 'R1-06-pot-chip-pile')

    // Wait for fixtures (~35s)
    console.log('R1 — Waiting for fixtures...')
    await page.waitForTimeout(35000)
    await shot(page, 'R1-07-fixtures-revealed')

    // Wait for score popups
    await page.waitForTimeout(15000)
    await shot(page, 'R1-08-score-popups')

    // Check: directional score popups, winner glow
    await page.waitForTimeout(5000)
    await shot(page, 'R1-09-winner-announcement')

    // Check: winner banner
    const winnerText = await page.locator('[data-testid="winner-banner"]').textContent().catch(() => '')
    console.log('R1 winner: ' + (winnerText ?? '').slice(0, 40))

    // Wait for transition
    await page.waitForSelector('[data-testid="winner-banner"]', { state: 'hidden', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(3000)

    // ── ROUND 2 ─────────────────────────────────────────────────
    await shot(page, 'R2-01-new-round')
    console.log('R2 — Started')

    // Check: phase badge color
    await shot(page, 'R2-02-phase-badge')

    // Play through round 2
    for (let i = 0; i < 3; i++) {
      await waitAndAct(page)
      await page.waitForTimeout(10000)
    }
    await shot(page, 'R2-03-betting-done')

    // Fixtures + scoring
    await page.waitForTimeout(35000)
    await shot(page, 'R2-04-fixtures')
    await page.waitForTimeout(20000)
    await shot(page, 'R2-05-scoring')

    const winner2 = await page.locator('[data-testid="winner-banner"]').textContent().catch(() => '')
    console.log('R2 winner: ' + (winner2 ?? '').slice(0, 40))

    await page.waitForSelector('[data-testid="winner-banner"]', { state: 'hidden', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(3000)

    // ── ROUND 3 ─────────────────────────────────────────────────
    await shot(page, 'R3-01-new-round')
    console.log('R3 — Started')

    // Check: seat 0 layout, YOU label, card dock
    await shot(page, 'R3-02-seat0-layout')

    // Play through round 3
    for (let i = 0; i < 3; i++) {
      await waitAndAct(page)
      await page.waitForTimeout(10000)
    }

    // Fixtures + scoring
    await page.waitForTimeout(35000)
    await shot(page, 'R3-03-fixtures')
    await page.waitForTimeout(20000)
    await shot(page, 'R3-04-final-scoring')

    const winner3 = await page.locator('[data-testid="winner-banner"]').textContent().catch(() => '')
    console.log('R3 winner: ' + (winner3 ?? '').slice(0, 40))

    await shot(page, 'R3-05-winner-final')

    // ── LAYER CHECK ─────────────────────────────────────────────
    // Final composite at various states
    await page.waitForTimeout(5000)
    await shot(page, 'Z-final-state')

    console.log('AUDIT COMPLETE — all screenshots saved')
  } finally {
    await ctx.close()
  }
})
