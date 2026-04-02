import { test, expect } from '@playwright/test'
import { guestLogin } from './helpers/auth.helper'
import { createTable, addBots, startGame } from './helpers/table.helper'

test.describe('Table Setup', () => {
  test.beforeEach(async ({ page }) => {
    await guestLogin(page)
  })

  test('creates a table and lands on game URL', async ({ page }) => {
    const url = await createTable(page, { name: 'E2E Setup Test' })
    expect(url).toMatch(/\/table\/[a-f0-9-]{36}/)
    await page.screenshot({ path: 'e2e/screenshots/table-empty.png' })
  })

  test('adds 4 bots one by one without crashing', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))

    await createTable(page, { name: 'E2E Bot Test' })
    await addBots(page, 4)

    const hookErrors = errors.filter((e) => e.toLowerCase().includes('hook'))
    expect(hookErrors).toHaveLength(0)
    await page.screenshot({ path: 'e2e/screenshots/table-with-bots.png' })
  })

  test('shows 5/5 player count after adding 4 bots', async ({ page }) => {
    await createTable(page, { name: 'E2E Count Test' })
    await addBots(page, 4)
    await expect(page.locator('span').filter({ hasText: '5/5' }).first()).toBeVisible()
  })

  test('Start Game button enabled with 5 players', async ({ page }) => {
    await createTable(page, { name: 'E2E Start Test' })
    await addBots(page, 4)
    await expect(
      page.locator('button').filter({ hasText: 'Start Game' }).first(),
    ).toBeEnabled()
  })

  // Sprint 1 — J6: Blind config in Create Table modal
  test.describe('Blind Config', () => {
    test('shows Small Blind and Big Blind inputs with defaults SB=5 BB=10', async ({ page }) => {
      await page.locator('button').filter({ hasText: 'Create Table' }).first().click()
      await page.waitForTimeout(1000)

      const numInputs = page.locator('input[type="number"]')
      const count = await numInputs.count()
      expect(count).toBeGreaterThanOrEqual(3)

      const sbVal = await numInputs.nth(1).inputValue()
      const bbVal = await numInputs.nth(2).inputValue()
      expect(sbVal).toBe('5')
      expect(bbVal).toBe('10')
      await page.screenshot({ path: 'e2e/screenshots/table-blind-defaults.png' })
    })

    test('BB auto-updates when SB changes', async ({ page }) => {
      await page.locator('button').filter({ hasText: 'Create Table' }).first().click()
      await page.waitForTimeout(1000)

      const numInputs = page.locator('input[type="number"]')
      await numInputs.nth(1).fill('25')
      await numInputs.nth(1).dispatchEvent('input')
      await page.waitForTimeout(400)

      const bbVal = await numInputs.nth(2).inputValue()
      expect(bbVal).toBe('50')
    })

    test('BB field is read-only (auto-calculated as 2x SB)', async ({ page }) => {
      await page.locator('button').filter({ hasText: 'Create Table' }).first().click()
      await page.waitForTimeout(1000)

      const bbInput = page.locator('input[type="number"]').nth(2)
      const isDisabled = await bbInput.isDisabled()
      const isReadOnly = await bbInput.getAttribute('readonly')
      expect(isDisabled || isReadOnly !== null).toBe(true)
      await page.screenshot({ path: 'e2e/screenshots/table-bb-readonly.png' })
    })

    test('SB=0 is blocked — Create button disabled', async ({ page }) => {
      await page.locator('button').filter({ hasText: 'Create Table' }).first().click()
      await page.waitForTimeout(1000)

      const sbInput = page.locator('input[type="number"]').nth(1)
      await sbInput.fill('0')
      await sbInput.dispatchEvent('input')
      await sbInput.press('Tab')
      await page.waitForTimeout(600)

      const createDisabled = await page
        .locator('button')
        .filter({ hasText: /^Create$/ })
        .last()
        .isDisabled()
      expect(createDisabled).toBe(true)
      await page.screenshot({ path: 'e2e/screenshots/table-sb-zero-validation.png' })
    })

    test('creates table successfully with custom blind SB=25', async ({ page }) => {
      await page.locator('button').filter({ hasText: 'Create Table' }).first().click()
      await page.waitForTimeout(1000)

      await page.locator('input[type="text"]').first().fill('Custom Blind Table')
      const numInputs = page.locator('input[type="number"]')
      await numInputs.nth(1).fill('25')
      await numInputs.nth(1).dispatchEvent('input')
      await page.waitForTimeout(400)

      await page.locator('button').filter({ hasText: /^Create$/ }).last().click()
      await page.waitForTimeout(3000)
      expect(page.url()).toMatch(/\/table\/[a-f0-9-]{36}/)
    })
  })
})
