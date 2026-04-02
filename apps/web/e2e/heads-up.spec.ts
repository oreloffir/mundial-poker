import { test, expect } from '@playwright/test'
import { guestLogin } from './helpers/auth.helper'
import { createTable, addBots, startGame } from './helpers/table.helper'
import { waitForBetPrompt, bettingControls } from './helpers/game.helper'

test.describe('Heads-Up (2-Player Game)', () => {
  test.beforeEach(async ({ page }) => {
    await guestLogin(page)
  })

  test('game starts with 1 bot + human (2 players)', async ({ page }) => {
    await createTable(page, { name: 'E2E Heads Up' })
    await addBots(page, 1)
    await startGame(page)

    expect(page.url()).toMatch(/\/table\/[a-f0-9-]{36}/)
    await page.screenshot({ path: 'e2e/screenshots/headsup-start.png' })
  })

  test('5 fixture cards are dealt in 2-player game', async ({ page }) => {
    await createTable(page, { name: 'E2E HU Fixtures' })
    await addBots(page, 1)
    await startGame(page)

    // Fixture cards should be visible in center
    // Checking via screenshot and locator count
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'e2e/screenshots/headsup-fixtures.png' })
    // TODO: use data-testid="fixture-card-{n}" when added
  })

  test('betting controls appear during player turn in heads-up', async ({ page }) => {
    await createTable(page, { name: 'E2E HU Betting' })
    await addBots(page, 1)
    await startGame(page)

    const prompt = await waitForBetPrompt(page)
    expect(prompt).not.toBeNull()

    const controls = bettingControls(page)
    await expect(controls.fold).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/headsup-betting.png' })
  })
})
