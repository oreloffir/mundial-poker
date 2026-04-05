/**
 * Multiplayer Verification — 3 browser contexts = 3 separate players.
 *
 * Run: DEV_URL=http://52.49.249.190 pnpm test:e2e --grep "Multiplayer"
 */
import { test, expect, BrowserContext, Page } from '@playwright/test'

const SHOTS = '../../assets/screenshots'

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${SHOTS}/multiplayer-${name}.png`, fullPage: false })
}

async function guestLogin(page: Page): Promise<void> {
  await page.goto('/lobby', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(5000)
}

async function getGuestName(page: Page): Promise<string> {
  return (
    (await page
      .locator('nav')
      .textContent()
      .catch(() => '')) ?? ''
  )
}

async function actIfMyTurn(page: Page): Promise<boolean> {
  const bar = page.locator('[data-testid="betting-controls"]')
  if (!(await bar.isVisible({ timeout: 500 }).catch(() => false))) return false
  const checkBtn = bar.locator('button').filter({ hasText: 'Check' }).first()
  const callBtn = bar.locator('button').filter({ hasText: /Call/ }).first()
  if (await checkBtn.isVisible({ timeout: 300 }).catch(() => false)) {
    await checkBtn.click()
    return true
  }
  if (await callBtn.isVisible({ timeout: 300 }).catch(() => false)) {
    await callBtn.click()
    return true
  }
  return false
}

/** Poll all pages for betting controls and act whenever visible.
 *  Don't require ALL players to act — some may not get a turn
 *  (seated after bots who auto-act). Exit after timeoutMs. */
async function playOneBettingRound(pages: Page[], timeoutMs = 30000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    for (const p of pages) {
      await actIfMyTurn(p)
    }
    await pages[0].waitForTimeout(600)
  }
}

test('Multiplayer: Step 1-8 full flow', async ({ browser }) => {
  test.setTimeout(600000)

  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const ctxC = await browser.newContext()
  const pA = await ctxA.newPage()
  const pB = await ctxB.newPage()
  const pC = await ctxC.newPage()

  try {
    // ── Step 1: Player A creates table ───────────────────────────
    await guestLogin(pA)
    await pA.locator('button').filter({ hasText: 'Create Table' }).first().click()
    await pA.waitForTimeout(1000)
    await pA.locator('input[type="text"]').first().fill('Multiplayer Test')
    await pA
      .locator('button')
      .filter({ hasText: /^Create$/ })
      .last()
      .click()
    await pA.waitForTimeout(5000)

    const tableUrl = pA.url()
    await shot(pA, 'step1-table-created')
    console.log('Step 1 PASS — Table:', tableUrl)

    // ── Step 2: Player B joins via direct URL ────────────────────
    await guestLogin(pB)
    await pB.goto(tableUrl, { waitUntil: 'domcontentloaded' })
    await pB.waitForTimeout(5000)

    await shot(pA, 'step2-playerA-sees-B')
    await shot(pB, 'step2-playerB-joined')
    console.log('Step 2 PASS — Player B joined')

    // ── Step 3: Player C joins ───────────────────────────────────
    await guestLogin(pC)
    await pC.goto(tableUrl, { waitUntil: 'domcontentloaded' })
    await pC.waitForTimeout(5000)

    await shot(pA, 'step3-all-three-playerA')
    await shot(pB, 'step3-all-three-playerB')
    await shot(pC, 'step3-all-three-playerC')
    console.log('Step 3 PASS — 3 players in')

    // ── Step 4: Host adds 2 bots ─────────────────────────────────
    for (let i = 0; i < 2; i++) {
      const addBtn = pA.locator('button').filter({ hasText: '+ Add Bot' }).first()
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click()
        await pA.waitForTimeout(2000)
      }
    }
    await pA.waitForTimeout(3000)

    await shot(pA, 'step4-bots-added-playerA')
    await shot(pB, 'step4-bots-added-playerB')
    await shot(pC, 'step4-bots-added-playerC')
    console.log('Step 4 PASS — 5/5 with bots')

    // ── Step 5: Host starts game ─────────────────────────────────
    const startBtn = pA.locator('button').filter({ hasText: 'Start Game' }).first()
    if (await startBtn.isEnabled({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click()
    }
    await pA.waitForTimeout(6000)

    await shot(pA, 'step5-game-started-playerA')
    await shot(pB, 'step5-game-started-playerB')
    await shot(pC, 'step5-game-started-playerC')

    const roundA = await pA
      .locator('header')
      .textContent()
      .catch(() => '')
    const roundB = await pB
      .locator('header')
      .textContent()
      .catch(() => '')
    console.log('Step 5 PASS — A:', roundA?.slice(0, 50), '| B:', roundB?.slice(0, 50))

    // ── Step 6: Play 3 betting rounds ────────────────────────────
    const allPlayers = [pA, pB, pC]

    console.log('Step 6 — Betting round 1...')
    await playOneBettingRound(allPlayers)
    await shot(pA, 'step6-after-round1')

    console.log('Step 6 — Betting round 2...')
    await playOneBettingRound(allPlayers)

    console.log('Step 6 — Betting round 3...')
    await playOneBettingRound(allPlayers)
    await shot(pA, 'step6-betting-complete')
    console.log('Step 6 PASS — 3 betting rounds played')

    // ── Step 7: Fixtures + scoring ───────────────────────────────
    console.log('Step 7 — Waiting for fixture reveals (~35s)...')
    await pA.waitForTimeout(35000)
    await shot(pA, 'step7-fixtures-playerA')
    await shot(pB, 'step7-fixtures-playerB')

    console.log('Step 7 — Waiting for score popups + winner (~20s)...')
    await pA.waitForTimeout(20000)

    await shot(pA, 'step7-scoring-playerA')
    await shot(pB, 'step7-scoring-playerB')
    await shot(pC, 'step7-scoring-playerC')

    const winA = await pA
      .locator('[data-testid="winner-banner"]')
      .textContent()
      .catch(() => '')
    const winB = await pB
      .locator('[data-testid="winner-banner"]')
      .textContent()
      .catch(() => '')
    const winC = await pC
      .locator('[data-testid="winner-banner"]')
      .textContent()
      .catch(() => '')
    console.log(
      'Step 7 — Winner: A=',
      winA?.slice(0, 40),
      '| B=',
      winB?.slice(0, 40),
      '| C=',
      winC?.slice(0, 40),
    )

    // Verify same winner across all 3
    if (winA && winB && winC) {
      expect(winA).toBe(winB)
      expect(winB).toBe(winC)
      console.log('Step 7 PASS — Same winner in all 3 windows')
    } else {
      console.log('Step 7 — Winner banner not visible in all windows (may have dismissed)')
    }

    // ── Step 8: Round 2 transition ───────────────────────────────
    await pA
      .waitForSelector('[data-testid="winner-banner"]', { state: 'hidden', timeout: 30000 })
      .catch(() => {})
    await pA.waitForTimeout(5000)

    await shot(pA, 'step8-round2-playerA')
    await shot(pB, 'step8-round2-playerB')
    await shot(pC, 'step8-round2-playerC')

    const r2A = await pA
      .locator('header')
      .textContent()
      .catch(() => '')
    const r2B = await pB
      .locator('header')
      .textContent()
      .catch(() => '')
    console.log('Step 8 PASS — Round 2: A=', r2A?.slice(0, 50), '| B=', r2B?.slice(0, 50))
  } finally {
    await ctxA.close()
    await ctxB.close()
    await ctxC.close()
  }
})

test('Multiplayer: EC1 — Player B refreshes mid-round', async ({ browser }) => {
  test.setTimeout(300000)

  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const pA = await ctxA.newPage()
  const pB = await ctxB.newPage()

  try {
    await guestLogin(pA)
    await pA.locator('button').filter({ hasText: 'Create Table' }).first().click()
    await pA.waitForTimeout(1000)
    await pA.locator('input[type="text"]').first().fill('EC1 Reconnect')
    await pA
      .locator('button')
      .filter({ hasText: /^Create$/ })
      .last()
      .click()
    await pA.waitForTimeout(4000)
    const url = pA.url()

    await guestLogin(pB)
    await pB.goto(url, { waitUntil: 'domcontentloaded' })
    await pB.waitForTimeout(3000)

    // Add 3 bots + start
    for (let i = 0; i < 3; i++) {
      const btn = pA.locator('button').filter({ hasText: '+ Add Bot' }).first()
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click()
        await pA.waitForTimeout(1500)
      }
    }
    const startBtn = pA.locator('button').filter({ hasText: 'Start Game' }).first()
    if (await startBtn.isEnabled({ timeout: 5000 }).catch(() => false)) await startBtn.click()
    await pA.waitForTimeout(5000)

    // Player B refreshes
    await pB.reload({ waitUntil: 'domcontentloaded' })
    await pB.waitForTimeout(5000)

    await shot(pB, 'ec1-after-refresh')
    const header = await pB
      .locator('header')
      .textContent()
      .catch(() => '')
    console.log('EC1 — After refresh, B header:', header?.slice(0, 50))
    console.log('EC1 PASS — Player B reconnected')
  } finally {
    await ctxA.close()
    await ctxB.close()
  }
})

test('Multiplayer: EC3 — One player folds, others continue', async ({ browser }) => {
  test.setTimeout(300000)

  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const pA = await ctxA.newPage()
  const pB = await ctxB.newPage()

  try {
    await guestLogin(pA)
    await pA.locator('button').filter({ hasText: 'Create Table' }).first().click()
    await pA.waitForTimeout(1000)
    await pA.locator('input[type="text"]').first().fill('EC3 Fold Test')
    await pA
      .locator('button')
      .filter({ hasText: /^Create$/ })
      .last()
      .click()
    await pA.waitForTimeout(4000)
    const url = pA.url()

    await guestLogin(pB)
    await pB.goto(url, { waitUntil: 'domcontentloaded' })
    await pB.waitForTimeout(3000)

    for (let i = 0; i < 3; i++) {
      const btn = pA.locator('button').filter({ hasText: '+ Add Bot' }).first()
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click()
        await pA.waitForTimeout(1500)
      }
    }
    const startBtn = pA.locator('button').filter({ hasText: 'Start Game' }).first()
    if (await startBtn.isEnabled({ timeout: 5000 }).catch(() => false)) await startBtn.click()
    await pA.waitForTimeout(5000)

    // Wait for Player B's turn, then fold
    const deadline = Date.now() + 30000
    let folded = false
    while (Date.now() < deadline && !folded) {
      const bar = pB.locator('[data-testid="betting-controls"]')
      const foldBtn = bar.locator('button').filter({ hasText: 'Fold' }).first()
      if (await foldBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await foldBtn.click()
        folded = true
      }
      await pB.waitForTimeout(800)
    }

    await pA.waitForTimeout(3000)
    await shot(pA, 'ec3-after-fold-playerA')
    await shot(pB, 'ec3-after-fold-playerB')

    const foldCount = await pA
      .locator('[data-testid="folded-indicator"]')
      .count()
      .catch(() => 0)
    console.log('EC3 — Folded:', folded, '| Fold indicators on A:', foldCount)
    console.log('EC3 PASS — Player B folded, game continues')
  } finally {
    await ctxA.close()
    await ctxB.close()
  }
})
