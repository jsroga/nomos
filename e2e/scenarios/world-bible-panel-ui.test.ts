import { test, expect } from '@playwright/test'

const TEST_PROJECT_ID = '00000000-0000-0000-0000-000000000000'
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('WorldBiblePanel UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Pipe browser console logs to terminal
    page.on('console', msg => console.log(`[BROWSER]: ${msg.text()}`))

    // Log all network requests
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/rest/v1/') || url.includes('/auth/v1/') || url.includes('/api/')) {
        console.log(`[NETWORK] >> ${request.method()} ${url}`)
      }
    })

    // Add bypass auth header for middleware
    await page.setExtraHTTPHeaders({
      'x-bypass-auth': 'true',
    })

    // Mock Supabase session/user
    await page.route(/\/auth\/v1\/user/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'dev-mock-user-id',
          email: 'jsroga@example.com',
          user_metadata: { user_name: 'jsroga' },
        }),
      })
    })

    // Mock Project Data (direct Supabase REST API)
    await page.route(/\/rest\/v1\/projects/, async route => {
      const url = route.request().url()
      const acceptHeader = route.request().headers()['accept'] || ''
      const isSingle = acceptHeader.includes('application/vnd.pgrst.object+json')

      console.log(`[MOCK] Intercepted Projects request: ${url} (isSingle: ${isSingle})`)

      // If it's a specific project fetch
      if (url.includes('id=eq.')) {
        const projectData = {
          id: TEST_PROJECT_ID,
          name: 'Test World',
          project_prompt: 'A science fiction world.',
          series_bible: {
            title: 'Test World',
            worldDescription: 'A world of tests.',
            genre: 'Sci-Fi',
            tone: 'Experimental',
            worldRules: [
              {
                category: 'Physics',
                rule: 'Gravity works',
                consequence: 'Things fall down',
              },
            ],
            factions: [
              {
                id: 'testers-union',
                name: 'Testers Union',
                ideology: 'Bug-free code is bliss',
                goals: ['Eliminate all bugs', 'Write perfect tests'],
                resources: 'High-end laptops and coffee',
              },
            ],
            soundtracks: [
              {
                title: 'Synth Wave',
                artist: 'Robot',
                youtubeUrl: 'https://youtube.com/watch?v=RScZrvTebeA',
              },
            ],
            plotTwists: ['The narrator is a bug', 'Complexity is the enemy'],
            seasonStructure: {
              seasonLogline: 'A world where tests rule everything.',
              incitingIncident: 'A bug appears.',
              midpointClimax: 'The bug is immortal.',
              seasonClimax: 'The test suite passes.',
              resolution: 'Peace returns.',
            },
            sequences: [
              {
                id: 'seq-1',
                name: 'The First Bug',
                description: 'A bug is discovered in production.',
                keyFactionsInvolved: ['testers-union'],
                worldConsequence: 'Chaos ensues',
              },
            ],
            keyCharacters: [
              {
                name: 'Jacek',
                role: 'Protagonist',
                archetype: 'The Developer',
                motivation: 'Solve all user requests',
                factionId: 'testers-union',
              },
            ],
          },
          created_at: new Date().toISOString(),
        }

        await route.fulfill({
          status: 200,
          contentType: isSingle ? 'application/vnd.pgrst.object+json' : 'application/json',
          body: JSON.stringify(isSingle ? projectData : [projectData]),
        })
      } else {
        // Multi-project list
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: TEST_PROJECT_ID, name: 'Test World' }]),
        })
      }
    })

    // Mock Tiles Data
    await page.route(/\/rest\/v1\/tiles/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    // Mock Characters API
    await page.route(/\/api\/storyteller\/characters/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    // Mock Episodes API
    await page.route(/\/api\/storyteller\/episodes/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    // Mock Entities API
    await page.route(/\/api\/entities/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    // Mock Bible lock status
    await page.route(/\/api\/storyteller\/bible\/lock/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isLocked: false }),
      })
    })
  })

  test('Panel renders all major sections correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/${TEST_PROJECT_ID}/storyteller?bible=open`)
    await page.waitForLoadState('networkidle')

    // Overview
    await expect(page.locator('h1').filter({ hasText: 'Test World' })).toBeVisible({
      timeout: 15000,
    })

    // Rules
    await expect(page.locator('text=Gravity works')).toBeVisible()

    // Factions
    await expect(page.locator('text=Testers Union')).toBeVisible()

    // Twists
    await expect(page.locator('text=The narrator is a bug')).toBeVisible()

    // Roadmap
    await expect(page.locator('text=The First Bug')).toBeVisible()
    await expect(page.locator('text=Season Spine')).toBeVisible()

    // Characters
    await expect(page.locator('text=Jacek')).toBeVisible()

    // Soundtracks
    await expect(page.locator('text=Synth Wave')).toBeVisible()
  })

  test('Edit mode: Character, Faction, and Rule operations', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/${TEST_PROJECT_ID}/storyteller?bible=open`)
    await page.waitForLoadState('networkidle')

    // Click Edit
    await page.getByRole('button', { name: 'Edit', exact: true }).click()

    // 1. Add and then Remove a Faction
    const addFactionBtn = page.getByTitle('Add Faction')
    await addFactionBtn.click()
    const factionNameInputs = page.getByPlaceholder('Faction Name...')
    await factionNameInputs.last().fill('New Faction')

    // Removal logic in refactored components might have different titles
    const removeFactionBtn = page.getByTitle('Remove Faction').last()
    await removeFactionBtn.click()
    await expect(page.getByText('New Faction')).not.toBeVisible()

    // 2. Add and then Remove a Character
    await page.getByTitle('Add Character').click()
    await page.getByPlaceholder('Character Name...').last().fill('New Character')
    await page.getByTitle('Remove Character').last().click()
    await expect(page.getByText('New Character')).not.toBeVisible()

    // 3. Add and then Remove a World Rule
    await page.getByTitle('Add World Rule').click()
    await page.getByPlaceholder('The rule...').last().fill('Entropy increases')
    await page.getByTitle('Remove Rule').last().click()
    await expect(page.getByText('Entropy increases')).not.toBeVisible()

    // Click Save
    await page.getByRole('button', { name: 'Save' }).last().click()
  })

  test('Empty states rendering', async ({ page }) => {
    // Override mock to return empty bible
    await page.route(/\/rest\/v1\/projects/, async route => {
      const acceptHeader = route.request().headers()['accept'] || ''
      const isSingle = acceptHeader.includes('application/vnd.pgrst.object+json')
      const emptyProject = {
        id: TEST_PROJECT_ID,
        name: 'Empty World',
        series_bible: {
          title: 'Empty World',
          worldDescription: '',
          worldRules: [],
          factions: [],
          plotTwists: [],
          sequences: [],
          keyCharacters: [],
        },
      }
      await route.fulfill({
        status: 200,
        contentType: isSingle ? 'application/vnd.pgrst.object+json' : 'application/json',
        body: JSON.stringify(isSingle ? emptyProject : [emptyProject]),
      })
    })

    await page.goto(`${BASE_URL}/app/${TEST_PROJECT_ID}/storyteller?bible=open`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=No factions defined')).toBeVisible()
    await expect(page.locator('text=No roadmap defined yet')).toBeVisible()
    await expect(page.locator('text=No key players defined yet')).toBeVisible()
  })

  test('Music playback controls (Verified)', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/${TEST_PROJECT_ID}/storyteller?bible=open`)
    await page.waitForLoadState('networkidle')

    // Find Play button for "Synth Wave"
    const playButton = page.getByTitle('Play').first()
    await expect(playButton).toBeVisible({ timeout: 15000 })
    await playButton.click()

    // Verify "Now Playing" floating player appears
    await expect(page.locator('text=Now Playing')).toBeVisible()
    await expect(page.locator('text=Synth Wave')).toBeVisible()

    // Stop music
    await page.getByTitle('Stop').click()
    await expect(page.getByTitle('Play').first()).toBeVisible()
  })

  test('Bible lock prevents editing for guest users', async ({ page }) => {
    // Mock Bible lock status as LOCKED
    await page.route(/\/api\/storyteller\/bible\/lock/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isLocked: true, lockedBy: 'Admin' }),
      })
    })

    // Mock non-admin user
    await page.route(/\/auth\/v1\/user/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'guest-user-id',
          email: 'guest@example.com',
          user_metadata: { user_name: 'guest' },
        }),
      })
    })

    await page.goto(`${BASE_URL}/app/${TEST_PROJECT_ID}/storyteller?bible=open`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=Read Only')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).not.toBeVisible()
  })
})
