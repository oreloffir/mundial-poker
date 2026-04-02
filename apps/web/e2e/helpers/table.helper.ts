import { Page } from '@playwright/test'

export interface TableOptions {
  name?: string
  startingChips?: number
  smallBlind?: number
  botCount?: number
}

/**
 * Open the Create Table modal, fill in options, and submit.
 * Returns the table URL after creation.
 */
export async function createTable(page: Page, options: TableOptions = {}): Promise<string> {
  const { name = 'E2E Test Table', startingChips, smallBlind } = options

  await page.locator('button').filter({ hasText: 'Create Table' }).first().click()
  await page.waitForTimeout(1000)

  await page.locator('input[type="text"]').first().fill(name)

  const numInputs = page.locator('input[type="number"]')
  const count = await numInputs.count()

  if (startingChips !== undefined && count >= 1) {
    await numInputs.nth(0).fill(String(startingChips))
    await page.waitForTimeout(200)
  }
  if (smallBlind !== undefined && count >= 2) {
    await numInputs.nth(1).fill(String(smallBlind))
    await page.waitForTimeout(300)
  }

  await page
    .locator('button')
    .filter({ hasText: /^Create$/ })
    .last()
    .click()
  await page.waitForTimeout(3000)

  return page.url()
}

/**
 * Click "+ Add Bot" n times. Waits 1.5s between each addition.
 */
export async function addBots(page: Page, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    const addBtn = page.locator('button').filter({ hasText: '+ Add Bot' }).first()
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(1500)
    }
  }
}

/**
 * Click "Start Game" and wait for the game to initialize.
 */
export async function startGame(page: Page): Promise<void> {
  await page.locator('button').filter({ hasText: 'Start Game' }).first().click()
  await page.waitForTimeout(4000)
}

/**
 * Full setup: create table → add bots → start game.
 * Returns the table URL.
 */
export async function setupGame(page: Page, options: TableOptions = {}): Promise<string> {
  const url = await createTable(page, options)
  await addBots(page, options.botCount ?? 4)
  await startGame(page)
  return url
}
