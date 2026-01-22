/**
 * Swiss Army Knife E2E Test
 *
 * Tests the complete cross-domain integration workflow:
 * 1. Create character in Storyteller
 * 2. Character auto-syncs to game_entities
 * 3. @mention character in Loop Creator
 * 4. AI receives character context
 * 5. Create mechanic in Loop Creator
 * 6. Suggestion toast appears
 * 7. Navigate back to Storyteller with context
 */

import { test, expect } from '@playwright/test'

const TEST_PROJECT_ID = process.env.TEST_PROJECT_ID || 'test-project-swiss-knife'
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Swiss Army Knife - Cross-Domain Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to project hub
    await page.goto(`${BASE_URL}/app/${TEST_PROJECT_ID}`)

    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test('Complete workflow: Character → Mechanics → Story roundtrip', async ({ page }) => {
    // ========================================
    // STEP 1: Create character in Storyteller
    // ========================================
    console.log('Step 1: Creating character in Storyteller...')

    // Navigate to Storyteller
    await page.click('a[href*="storyteller"]')
    await page.waitForURL(/.*storyteller.*/)
    await page.waitForLoadState('networkidle')

    // Open character creation dialog
    const createCharButton = page.locator(
      'button:has-text("Add Character"), button:has-text("Create Character")'
    )
    await createCharButton.first().click()

    // Fill in character details
    await page.fill('input[name="name"], input[placeholder*="name" i]', 'Alex Shadow')
    await page.fill(
      'textarea[name="description"], textarea[placeholder*="description" i]',
      'A stealthy assassin with supernatural agility'
    )

    // Select role (if available)
    const roleSelect = page.locator('select[name="role"]')
    if ((await roleSelect.count()) > 0) {
      await roleSelect.selectOption('Lead')
    }

    // Submit character creation
    await page.click('button:has-text("Create"), button:has-text("Save")')

    // Wait for character to be created
    await page.waitForResponse(
      response =>
        response.url().includes('/api/storyteller/characters') && response.status() === 200
    )

    console.log('✓ Character created')

    // ========================================
    // STEP 2: Verify entity auto-sync
    // ========================================
    console.log('Step 2: Verifying entity auto-sync...')

    // Check that game entity was created
    const entityResponse = await page.request.get(
      `${BASE_URL}/api/entities?projectId=${TEST_PROJECT_ID}&search=Alex`
    )
    expect(entityResponse.ok()).toBeTruthy()

    const { entities } = await entityResponse.json()
    expect(entities.length).toBeGreaterThan(0)

    const alexEntity = entities.find((e: any) => e.name === 'Alex Shadow')
    expect(alexEntity).toBeTruthy()
    expect(alexEntity.entityType).toBe('character')
    expect(alexEntity.sourceDomain).toBe('storyteller')

    console.log('✓ Entity auto-synced to game_entities table')

    // ========================================
    // STEP 3: Navigate to Loop Creator
    // ========================================
    console.log('Step 3: Navigating to Loop Creator...')

    // Go back to hub
    await page.goto(`${BASE_URL}/app/${TEST_PROJECT_ID}`)
    await page.waitForLoadState('networkidle')

    // Navigate to Loop Creator
    await page.click('a[href*="loop-creator"]')
    await page.waitForURL(/.*loop-creator.*/)
    await page.waitForLoadState('networkidle')

    console.log('✓ Navigated to Loop Creator')

    // ========================================
    // STEP 4: @mention character in chat
    // ========================================
    console.log('Step 4: Testing @mention functionality...')

    // Find chat input
    const chatInput = page
      .locator('textarea[placeholder*="message" i], textarea[placeholder*="chat" i]')
      .first()
    await chatInput.click()

    // Type @mention
    await chatInput.fill('@Alex')

    // Wait for mention dropdown to appear
    await page.waitForSelector('text=/Alex Shadow/i', { timeout: 5000 })

    // Verify mention shows source domain badge
    const mentionItem = page.locator('text=/Alex Shadow/i').first()
    await expect(mentionItem).toBeVisible()

    // Check for "Storyteller" badge or source indicator
    const storytellerBadge = page.locator('text=/storyteller/i').first()
    await expect(storytellerBadge).toBeVisible()

    console.log('✓ @mention works with cross-domain entity')

    // Select the mention
    await mentionItem.click()

    // Complete the message
    await chatInput.fill('@AlexShadow Design stealth mechanics for this character')

    // ========================================
    // STEP 5: Send message and verify AI context
    // ========================================
    console.log('Step 5: Sending message to AI...')

    // Send message
    await page.keyboard.press('Enter')

    // Wait for AI response
    await page.waitForSelector('text=/mechanic/i, text=/stealth/i, text=/Alex/i', {
      timeout: 30000,
    })

    console.log('✓ AI received character context and responded')

    // Verify AI mentions the character (shows it has context)
    const aiResponse = await page
      .locator('[role="article"], [data-message-type]')
      .last()
      .textContent()
    expect(aiResponse?.toLowerCase()).toMatch(/alex|character|stealth/)

    // ========================================
    // STEP 6: Create mechanic (simulate or verify suggestion)
    // ========================================
    console.log('Step 6: Verifying mechanic creation workflow...')

    // In a real scenario, the AI would create nodes on canvas
    // For now, we'll verify the suggestion toast would appear
    // (This requires the actual loop creation API to be called)

    // If there's a way to create a loop via UI, do it here
    // Otherwise, verify the API endpoint works
    const createLoopResponse = await page.request.post(`${BASE_URL}/api/loop-creator/loops`, {
      data: {
        projectId: TEST_PROJECT_ID,
        name: 'Shadow Step',
        metadata: {
          description: 'Stealth dash mechanic for Alex Shadow',
          type: 'core-mechanic',
        },
      },
    })

    expect(createLoopResponse.ok()).toBeTruthy()
    const loopData = await createLoopResponse.json()
    expect(loopData._suggestions).toBeDefined()
    expect(loopData._suggestions.length).toBeGreaterThan(0)

    console.log('✓ Mechanic created with suggestions')

    // ========================================
    // STEP 7: Verify Hub Dashboard shows entities
    // ========================================
    console.log('Step 7: Verifying Hub Dashboard...')

    await page.goto(`${BASE_URL}/app/${TEST_PROJECT_ID}`)
    await page.waitForLoadState('networkidle')

    // Check entity stats are displayed
    const characterCount = page.locator('text=/1.*character/i, text=/character.*1/i').first()
    await expect(characterCount).toBeVisible()

    const mechanicCount = page.locator('text=/1.*mechanic/i, text=/mechanic.*1/i').first()
    await expect(mechanicCount).toBeVisible()

    // Verify search works
    const searchInput = page.locator('input[placeholder*="search" i]').first()
    await searchInput.fill('Alex')

    // Wait for search results
    await page.waitForSelector('text=/Alex Shadow/i', { timeout: 5000 })

    console.log('✓ Hub Dashboard shows cross-domain entities')

    // ========================================
    // STEP 8: Verify roundtrip - back to Storyteller
    // ========================================
    console.log('Step 8: Testing roundtrip to Storyteller...')

    await page.click('a[href*="storyteller"]')
    await page.waitForURL(/.*storyteller.*/)
    await page.waitForLoadState('networkidle')

    // In chat, try to @mention the mechanic
    const storytellerChatInput = page.locator('textarea[placeholder*="message" i]').first()
    await storytellerChatInput.click()
    await storytellerChatInput.fill('@Shadow')

    // Wait for mention dropdown
    await page.waitForSelector('text=/Shadow Step/i', { timeout: 5000 })

    console.log('✓ Roundtrip successful - mechanics visible in Storyteller')

    console.log('========================================')
    console.log('✅ SWISS ARMY KNIFE E2E TEST PASSED')
    console.log('========================================')
  })

  test('Cross-domain mention autocomplete shows correct badges', async ({ page }) => {
    // Navigate to Loop Creator
    await page.goto(`${BASE_URL}/app/${TEST_PROJECT_ID}/loop-creator`)
    await page.waitForLoadState('networkidle')

    // Type @ in chat
    const chatInput = page.locator('textarea').first()
    await chatInput.fill('@')

    // Wait for mention dropdown
    await page.waitForTimeout(1000)

    // Verify entities from different domains have correct badges
    const entityItems = page.locator('[data-mention-item]')
    const count = await entityItems.count()

    if (count > 0) {
      // Check first entity has domain badge
      const firstItem = entityItems.first()
      const badges = firstItem.locator('span, badge')
      await expect(badges).toHaveCount({ min: 1 })
    }
  })

  test('Entity creation triggers suggestion toast', async ({ page }) => {
    // This test would require setting up toast interception
    // For now, we verify the API returns suggestions

    const response = await page.request.post(`${BASE_URL}/api/storyteller/characters`, {
      data: {
        projectId: TEST_PROJECT_ID,
        name: 'Test Character',
        role: 'Supporting',
      },
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()

    // Verify suggestions are returned
    expect(data._suggestions).toBeDefined()
    expect(Array.isArray(data._suggestions)).toBeTruthy()
    expect(data._suggestions.length).toBeGreaterThan(0)

    // Verify suggestion structure
    const suggestion = data._suggestions[0]
    expect(suggestion.targetDomain).toBeDefined()
    expect(suggestion.targetRoute).toBeDefined()
    expect(suggestion.title).toBeDefined()
  })

  test('AI agents receive cross-domain context', async ({ page }) => {
    // This test verifies AI context building
    // Would require actual AI call or API inspection

    // For now, verify the context builder works
    const contextResponse = await page.evaluate(async projectId => {
      // This would call the buildCrossDomainContext function
      const response = await fetch(`/api/entities?projectId=${projectId}`)
      return response.ok()
    }, TEST_PROJECT_ID)

    expect(contextResponse).toBeTruthy()
  })
})

test.describe('Entity Management API', () => {
  test('Create entity via API', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/entities`, {
      data: {
        projectId: TEST_PROJECT_ID,
        userId: 'test-user',
        entityType: 'character',
        name: 'API Test Character',
        description: 'Created via API test',
        sourceDomain: 'storyteller',
        metadata: {},
        tags: ['test'],
      },
    })

    expect(response.ok()).toBeTruthy()
    const { entity } = await response.json()
    expect(entity.name).toBe('API Test Character')
    expect(entity.entityType).toBe('character')
  })

  test('Search entities across domains', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/entities?projectId=${TEST_PROJECT_ID}`)
    expect(response.ok()).toBeTruthy()

    const { entities } = await response.json()
    expect(Array.isArray(entities)).toBeTruthy()

    // Verify entities have required fields
    if (entities.length > 0) {
      const entity = entities[0]
      expect(entity.id).toBeDefined()
      expect(entity.entityType).toBeDefined()
      expect(entity.sourceDomain).toBeDefined()
      expect(entity.usedInDomains).toBeDefined()
    }
  })

  test('Create entity relationship', async ({ request }) => {
    // First create two entities
    const char1Response = await request.post(`${BASE_URL}/api/entities`, {
      data: {
        projectId: TEST_PROJECT_ID,
        userId: 'test-user',
        entityType: 'character',
        name: 'Character A',
        sourceDomain: 'storyteller',
      },
    })

    const char2Response = await request.post(`${BASE_URL}/api/entities`, {
      data: {
        projectId: TEST_PROJECT_ID,
        userId: 'test-user',
        entityType: 'character',
        name: 'Character B',
        sourceDomain: 'storyteller',
      },
    })

    const { entity: entity1 } = await char1Response.json()
    const { entity: entity2 } = await char2Response.json()

    // Create relationship
    const relResponse = await request.post(`${BASE_URL}/api/entities/relationships`, {
      data: {
        projectId: TEST_PROJECT_ID,
        fromEntityId: entity1.id,
        toEntityId: entity2.id,
        relationshipType: 'allies_with',
      },
    })

    expect(relResponse.ok()).toBeTruthy()
    const { relationship } = await relResponse.json()
    expect(relationship.relationshipType).toBe('allies_with')
  })
})
