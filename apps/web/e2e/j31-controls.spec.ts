import { test, Page } from '@playwright/test'

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

    // Check 1: buttons visible during my turn
    await shot(page, 'j31-01-initial-controls')

    const foldBtn = page.locator('button').filter({ hasText: /Fold/i }).first()
    const checkBtn = page.locator('button').filter({ hasText: /Check/i }).first()
    const callBtn = page.locator('button').filter({ hasText: /Call/i }).first()
    const raiseBtn = page.locator('button').filter({ hasText: /Raise/i }).first()

    const hasFold = await foldBtn.isVisible({ timeout: 5000 }).catch(() => false)
    const hasCheck = await checkBtn.isVisible({ timeout: 2000 }).catch(() => false)
    const hasCall = await callBtn.isVisible({ timeout: 2000 }).catch(() => false)
    const hasRaise = await raiseBtn.isVisible({ timeout: 2000 }).catch(() => false)
    console.log(
      'Check 1 — Fold=' +
        hasFold +
        ' Check=' +
        hasCheck +
        ' Call=' +
        hasCall +
        ' Raise=' +
        hasRaise,
    )

    // Check 2: Tap Raise — chip list expands
    if (hasRaise) {
      await raiseBtn.click()
      await page.waitForTimeout(1500)
      await shot(page, 'j31-02-raise-expanded')

      // Check 3: chip denominations
      const chips = page.locator('button').filter({ hasText: /^\d+$/ })
      const chipCount = await chips.count()
      console.log('Check 3 — Chip buttons visible: ' + chipCount)

      if (chipCount > 0) {
        await chips.first().click()
        await page.waitForTimeout(500)
        await shot(page, 'j31-03-chip-selected')
      }

      // Check 4: Confirm raise
      const confirmBtn = page.locator('button').filter({ hasText: /Raise/i }).first()
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click()
        await page.waitForTimeout(3000)
        await shot(page, 'j31-04-raise-confirmed')
        console.log('Check 4 — Raise confirmed')
      }
    } else if (hasCheck || hasCall) {
      console.log('Check 2-4 — Raise not visible, acting with Check/Call instead')
      if (hasCheck) await checkBtn.click()
      else if (hasCall) await callBtn.click()
      await page.waitForTimeout(2000)
    }

    // Check 5-6: Scoring reference card
    const scoreText = page.locator('text=Win').first()
    const hasScoreText = await scoreText.isVisible({ timeout: 3000 }).catch(() => false)
    console.log('Check 5-6 — Scoring rules visible: ' + hasScoreText)
    await shot(page, 'j31-05-scoring-reference')

    // Check 7: Not my turn — buttons hidden
    await page.waitForTimeout(15000)
    const foldAfter = await foldBtn.isVisible({ timeout: 1000 }).catch(() => false)
    const raiseAfter = await raiseBtn.isVisible({ timeout: 1000 }).catch(() => false)
    console.log('Check 7 — After turn: Fold=' + foldAfter + ' Raise=' + raiseAfter)
    await shot(page, 'j31-07-not-my-turn')

    // Check 8: Overlap (visual)
    await shot(page, 'j31-08-overlap-check')
    console.log('Check 8 — See j31-08-overlap-check.png')

    // Final composite
    await shot(page, 'm-J31-corner-controls')
  } finally {
    await ctx.close()
  }
})
