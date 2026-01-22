/**
 * Cross-Domain Mention System E2E Tests
 *
 * Tests the @mention functionality across different domains
 */

import { test, expect } from '@playwright/test'

const TEST_PROJECT_ID = process.env.TEST_PROJECT_ID || 'test-project-mentions'
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Cross-Domain Mentions', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test data - create some entities
    await page.request.post(`${BASE_URL}/api/entities`, {
      data: {
        projectId: TEST_PROJECT_ID,
        userId: 'test-user',
        entityType: 'character',
        name: 'Mention Test Character',
        description: 'For testing mentions',
        sourceDomain: 'storyteller',
        metadata: { role: 'Lead' },
        tags: ['test'],
      },
    })

    await page.request.post(`${BASE_URL}/api/entities`, {
      data: {
        projectId: TEST_PROJECT_ID,
        userId: 'test-user',
        entityType: 'mechanic',
        name: 'Test Mechanic',
        description: 'For testing mentions',
        sourceDomain: 'loop-creator',
        metadata: {},
        tags: ['test'],
      },
    })
  })

  test('Autocomplete shows entities from all domains', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/${TEST_PROJECT_ID}/storyteller`)
    await page.waitForLoadState('networkidle')

    // Find chat input
    const chatInput = page.locator('textarea[placeholder*="message" i]').first()
    await chatInput.click()

    // Type @ to trigger mentions
    await chatInput.fill('@')
    await page.waitForTimeout(500)

    // Should see character from storyteller
    await expect(page.locator('text=/Mention Test Character/i')).toBeVisible({ timeout: 5000 })

    // Should also see mechanic from loop-creator (cross-domain!)
    await expect(page.locator('text=/Test Mechanic/i')).toBeVisible({ timeout: 5000 })
  })

  test('Mention chips display source domain', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/${TEST_PROJECT_ID}/loop-creator`)
    await page.waitForLoadState('networkidle')

    const chatInput = page.locator('textarea').first()
    await chatInput.fill('@Mention')
    await page.waitForTimeout(500)

    // Click on character mention (from different domain)
    const characterMention = page.locator('text=/Mention Test Character/i').first()
    await characterMention.click()

    // Verify mention chip shows source domain
    const mentionChip = page.locator('[class*="mention-chip"], [data-mention]').first()
    await expect(mentionChip).toBeVisible()

    // Should see "Storyteller" badge
    await expect(page.locator('text=/storyteller/i')).toBeVisible()
  })

  test('Filtered search works across domains', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/${TEST_PROJECT_ID}/storyteller`)
    await page.waitForLoadState('networkidle')

    const chatInput = page.locator('textarea').first()

    // Type specific filter
    await chatInput.fill('@Test')
    await page.waitForTimeout(500)

    // Should show both Test Character and Test Mechanic
    const mentionItems = page.locator('[data-mention-item], [role="option"]')
    const count = await mentionItems.count()

    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('Mention context is injected into message', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/${TEST_PROJECT_ID}/loop-creator`)
    await page.waitForLoadState('networkidle')

    const chatInput = page.locator('textarea').first()

    // Add mention
    await chatInput.fill('@Mention')
    await page.waitForTimeout(500)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    // Complete message
    await chatInput.fill('@MentionTestCharacter Design mechanics')

    // Intercept the API call to verify context is included
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/chat') && response.request().method() === 'POST'
    )

    await page.keyboard.press('Enter')

    const response = await responsePromise
    const requestBody = await response.request().postDataJSON()

    // Verify message includes mention context
    expect(requestBody.message).toContain('Mention')
  })
})

test.describe('Mention Resolver', () => {
  test('Click mention chip navigates to entity source', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/${TEST_PROJECT_ID}`)
    await page.waitForLoadState('networkidle')

    // Use entity search
    const searchInput = page.locator('input[placeholder*="search" i]').first()
    await searchInput.fill('Mention Test')
    await page.waitForTimeout(500)

    // Click on entity
    const entityItem = page.locator('text=/Mention Test Character/i').first()
    await entityItem.click()

    // Should navigate to storyteller (source domain)
    await page.waitForURL(/.*storyteller.*/, { timeout: 5000 })
  })
})
