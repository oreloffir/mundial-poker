/**
 * J31 — Betting Controls Redesign (Corner Circles)
 * Mobile 667x375 verification.
 *
 * Run: DEV_URL=https://52.49.249.190 pnpm test:e2e --grep "J31"
 */
import { test, expect, Page } from '@playwright/test'

const SHOTS = '../../assets/screenshots/sprint6'

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false })
}

test('J31: corner betting controls on mobile 667x375', async ({ browser }) => {
  test.setTimeout(300000)

  const ctx = await browser.newContext({
    viewport: { width: 667, height: 375 },
    ignoreHTTPSErrors: true,
  })
  const page = await ctx.newPage()

  try {
    // Setup: guest login → create table → add bots → start game
    await page.goto('/lobby', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)

    await page.locator('button').filter({ hasText: 'Create Table' }).first().click()
    await page.waitForTimeout(1000)
    await page.locator('input[type="text"]').first().fill('J31 Mobile Test')
    await page
      .locator('button')
      .filter({ hasText: /^Create$/ })
      .last()
      .click()
    await page.waitForTimeout(4000)

    for (let i = 0; i < 4; i++) {
      const btn = page.locator('button').filter({ hasText: '+ Add Bot' }).first()
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click()
        await page.waitForTimeout(1500)
      }
    }

    const startBtn = page.locator('button').filter({ hasText: 'Start Game' }).first()
    if (await startBtn.isEnabled({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click()
    }
    await page.waitForTimeout(6000)

    // ── Check 1: 3 circle buttons visible in bottom-right ─────────
    await shot(page, 'j31-01-initial-controls')

    // Look for the circle button container — could be bottom-right positioned buttons
    const foldBtn = page.locator('button').filter({ hasText: /Fold/i }).first()
    const checkBtn = page.locator('button').filter({ hasText: /Check/i }).first()
    const callBtn = page.locator('button').filter({ hasText: /Call/i }).first()
    const raiseBtn = page.locator('button').filter({ hasText: /Raise/i }).first()

    const hasFold = await foldBtn.isVisible({ timeout: 5000 }).catch(() => false)
    const hasCheck = await checkBtn.isVisible({ timeout: 2000 }).catch(() => false)
    const hasCall = await callBtn.isVisible({ timeout: 2000 }).catch(() => false)
    const hasRaise = await raiseBtn.isVisible({ timeout: 2000 }).catch(() => false)

    console.log(
      'Check 1 — Buttons visible: Fold=',
      hasFold,
      'Check=',
      hasCheck,
      'Call=',
      hasCall,
      'Raise=',
      hasRaise,
    )

    // ── Check 2: Tap Raise — chip list expands ────────────────────
    if (hasRaise) {
      await raiseBtn.click()
      await page.waitForTimeout(1500)
      await shot(page, 'j31-02-raise-expanded')

      // Check 3: chip denominations visible
      const chips = page.locator('button').filter({ hasText: /^\d+$/ })
      const chipCount = await chips.count()
      console.log('Check 3 — Chip denomination buttons visible:', chipCount)

      if (chipCount > 0) {
        // Tap a chip to build raise amount
        await chips.first().click()
        await page.waitForTimeout(500)
        await shot(page, 'j31-03-chip-selected')
        console.log('Check 3 — Tapped chip denomination')
      }

      // Check 4: Tap Raise again to confirm
      const confirmRaise = page.locator('button').filter({ hasText: /Raise/i }).first()
      if (await confirmRaise.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmRaise.click()
        await page.waitForTimeout(3000)
        await shot(page, 'j31-04-raise-confirmed')
        console.log('Check 4 — Raise confirmed')
      }
    } else if (hasCheck) {
      // If Check is shown instead of Call, take a raise screenshot anyway
      console.log(
        'Check 2-4 — No Raise visible, Check shown instead. Checking available actions...',
      )
      await shot(page, 'j31-02-check-shown')
    }

    // ── Check 5-6: Scoring reference card in bottom-left ──────────
    const scoreRef = page.locator('[data-testid="scoring-reference"]').first()
    const scoreRefAlt = page.locator('text=Win').first()
    const hasScoreRef = await scoreRef.isVisible({ timeout: 3000 }).catch(() => false)
    const hasScoreText = await scoreRefAlt.isVisible({ timeout: 2000 }).catch(() => false)

    console.log('Check 5 — Scoring reference testid visible:', hasScoreRef)
    console.log('Check 6 — Score rules text ("Win") visible:', hasScoreText)

    if (hasScoreRef || hasScoreText) {
      await shot(page, 'j31-05-scoring-reference')
    }

    // ── Check 7: When NOT your turn — buttons hidden ──────────────
    // Wait for bots to act and round to advance past our turn
    await page.waitForTimeout(15000)
    await shot(page, 'j31-07-not-my-turn')

    const foldAfter = await foldBtn.isVisible({ timeout: 1000 }).catch(() => false)
    const checkAfter = await checkBtn.isVisible({ timeout: 1000 }).catch(() => false)
    const raiseAfter = await raiseBtn.isVisible({ timeout: 1000 }).catch(() => false)
    console.log(
      'Check 7 — Buttons after turn ends: Fold=',
      foldAfter,
      'Check=',
      checkAfter,
      'Raise=',
      raiseAfter,
    )

    // ── Check 8: Overlap check ────────────────────────────────────
    // Take a full screenshot for visual overlap inspection
    await shot(page, 'j31-08-overlap-check')
    console.log('Check 8 — Overlap: see screenshot j31-08-overlap-check.png')

    // Final composite screenshot
    await shot(page, 'm-J31-corner-controls')
  } finally {
    await ctx.close()
  }
})
