import { test, expect } from '@playwright/test'
import { guestLogin } from './helpers/auth.helper'
import { createTable } from './helpers/table.helper'

test.describe('Lobby', () => {
  test.beforeEach(async ({ page }) => {
    await guestLogin(page)
  })

  test('shows Create Table button', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: 'Create Table' }).first()).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/lobby-main.png' })
  })

  test('Create Table modal opens with required fields', async ({ page }) => {
    await page.locator('button').filter({ hasText: 'Create Table' }).first().click()
    await page.waitForTimeout(1000)

    await expect(page.locator('input[type="text"]').first()).toBeVisible()
    await expect(page.locator('input[type="number"]').first()).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/lobby-create-modal.png' })
  })

  test('Create Table modal can be cancelled', async ({ page }) => {
    await page.locator('button').filter({ hasText: 'Create Table' }).first().click()
    await page.waitForTimeout(1000)
    await page.locator('button').filter({ hasText: 'Cancel' }).click()
    await page.waitForTimeout(500)
    await expect(page.locator('button').filter({ hasText: 'Create Table' }).first()).toBeVisible()
  })

  test('newly created table appears in lobby', async ({ page }) => {
    const tableName = 'E2E Lobby Test'
    await createTable(page, { name: tableName })
    await page.goto('/lobby', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)
    await expect(page.locator(`text=${tableName}`).first()).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/lobby-table-card.png' })
  })
})
