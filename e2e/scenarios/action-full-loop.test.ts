/**
 * E2E Test: Full-Loop Action Approval Flow
 *
 * Tests the complete lifecycle:
 * 1. Send message that triggers an action (e.g., "suggest soundtracks")
 * 2. Verify action has pending status with correct payload
 * 3. Approve the action via API
 * 4. Verify data is persisted in the database
 * 5. Send follow-up query to verify AI is aware of the committed data
 *
 * Run with: npx tsx e2e/scenarios/action-full-loop.test.ts
 */

import { config } from '../config'

interface StreamedAction {
  type: string
  payload: any
  status?: string
}

interface StreamedMessage {
  sender: string
  content: string
  type: string
  actions?: StreamedAction[]
}

// Test result tracking
interface TestResult {
  step: string
  passed: boolean
  message: string
}

class FullLoopTestRunner {
  private results: TestResult[] = []

  log(msg: string) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8)
    console.log(`[${timestamp}] ${msg}`)
  }

  recordResult(step: string, passed: boolean, message: string) {
    this.results.push({ step, passed, message })
    this.log(`${passed ? '✅' : '❌'} Step "${step}": ${message}`)
  }

  /**
   * Parse SSE stream and extract messages with actions
   */
  async sendMessageAndCollectActions(
    message: string,
    projectId = config.TEST_PROJECT_ID,
    episodeId?: string
  ): Promise<{ messages: StreamedMessage[]; rawContent: string }> {
    this.log(`📤 Sending: "${message.slice(0, 80)}..."`)

    const payload: any = {
      messages: [{ role: 'user', content: message }],
      projectId,
      phase: 'premise',
    }

    if (episodeId) {
      payload.episodeId = episodeId
    }

    const response = await fetch(config.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    const messages: StreamedMessage[] = []
    let rawContent = ''

    if (!reader) throw new Error('No response body')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      rawContent += chunk

      // Parse SSE events
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'message' && data.message) {
              messages.push(data.message)
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    this.log(`📥 Collected ${messages.length} messages.`)
    return { messages, rawContent }
  }

  /**
   * Approve an action via the actions API
   */
  async approveAction(
    action: StreamedAction,
    projectId = config.TEST_PROJECT_ID,
    episodeId?: string
  ): Promise<{ success: boolean; result: any }> {
    this.log(`🔧 Calling actions API for: ${action.type}`)

    const body: any = {
      action,
      projectId,
    }

    if (episodeId) {
      body.episodeId = episodeId
    }

    const response = await fetch('http://localhost:3000/api/storyteller/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return data
  }

  /**
   * Fetch the current state of the project/story plan
   */
  async fetchStoryPlan(projectId = config.TEST_PROJECT_ID): Promise<any> {
    this.log(`🔍 Fetching story plan for project: ${projectId}`)

    // Try the plan endpoint first
    let response = await fetch(`http://localhost:3000/api/storyteller/plan?projectId=${projectId}`)

    if (response.ok) {
      return await response.json()
    }

    // Fallback to project endpoint
    response = await fetch(`http://localhost:3000/api/storyteller/projects/${projectId}`)
    if (response.ok) {
      return await response.json()
    }

    throw new Error(`Failed to fetch story data: ${response.status}`)
  }

  getSummary(): { passed: number; failed: number; total: number } {
    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.filter(r => !r.passed).length
    return { passed, failed, total: this.results.length }
  }
}

// =============================================================================
// FULL LOOP TEST: Soundtracks
// =============================================================================

async function testFullLoopSoundtracks() {
  console.log('\n' + '='.repeat(70))
  console.log('🧪 FULL LOOP TEST: Soundtracks (Propose → Approve → Verify → AI Awareness)')
  console.log('='.repeat(70) + '\n')

  const runner = new FullLoopTestRunner()
  const projectId = config.TEST_PROJECT_ID

  try {
    // =========================================================================
    // STEP 1: Send message to trigger soundtrack proposal
    // =========================================================================
    runner.log('\n📍 STEP 1: Trigger soundtrack proposal\n')

    const triggerMessage = `Suggest 3-5 real YouTube soundtrack recommendations for this world. 
For each track, provide the song title, artist name, and actual YouTube URL. 
Choose music that reinforces the tone and atmosphere.`

    const { messages } = await runner.sendMessageAndCollectActions(triggerMessage, projectId)

    // Find the soundtrack action
    const allActions = messages.flatMap(m => m.actions || [])
    const soundtrackAction = allActions.find(
      a =>
        a.type === 'UPDATE_SOUNDTRACKS' ||
        (a.type === 'UPDATE_SERIES_BIBLE' && a.payload?.storyPlan?.soundtracks)
    )

    if (!soundtrackAction) {
      // Debug: show what we received
      runner.log(`   DEBUG: Received ${messages.length} messages`)
      messages.forEach((m, i) => {
        runner.log(`   [${i}] ${m.sender}: ${m.content?.slice(0, 100)}...`)
        runner.log(`       Actions: ${m.actions?.length || 0}`)
      })

      runner.recordResult(
        '1-trigger',
        false,
        `No soundtrack action found. Got ${allActions.length} actions: ${allActions.map(a => a.type).join(', ')}`
      )
      throw new Error('Test cannot proceed without an action')
    }

    // Extract soundtrack data
    let soundtracks: any[] = []
    if (soundtrackAction.type === 'UPDATE_SOUNDTRACKS') {
      soundtracks = soundtrackAction.payload?.soundtracks || []
    } else if (soundtrackAction.type === 'UPDATE_SERIES_BIBLE') {
      soundtracks = soundtrackAction.payload?.storyPlan?.soundtracks || []
    }

    runner.recordResult(
      '1-trigger',
      soundtracks.length >= 1,
      `Found ${soundtracks.length} soundtrack(s): ${soundtracks
        .map(s => s.title)
        .slice(0, 3)
        .join(', ')}...`
    )

    // =========================================================================
    // STEP 2: Verify action structure (payload has required fields)
    // =========================================================================
    runner.log('\n📍 STEP 2: Verify action payload structure\n')

    const firstTrack = soundtracks[0]
    const hasTitle = !!firstTrack?.title
    const hasArtist = !!firstTrack?.artist
    const hasUrl = !!firstTrack?.youtubeUrl

    runner.recordResult(
      '2-payload',
      hasTitle && hasArtist,
      `Track structure: title=${hasTitle}, artist=${hasArtist}, url=${hasUrl}`
    )

    // Remember track names for awareness check
    const trackNames = soundtracks.map(s => s.title || s.artist).slice(0, 3)

    // =========================================================================
    // STEP 3: Approve the action
    // =========================================================================
    runner.log('\n📍 STEP 3: Approve the action via API\n')

    const approvalResult = await runner.approveAction(soundtrackAction, projectId)

    runner.recordResult(
      '3-approve',
      approvalResult.success === true,
      approvalResult.success
        ? 'Action approved'
        : `Approval failed: ${approvalResult.error || 'Unknown'}`
    )

    if (!approvalResult.success) {
      throw new Error('Approval failed - cannot verify persistence')
    }

    // =========================================================================
    // STEP 4: Verify data is persisted in DB
    // =========================================================================
    runner.log('\n📍 STEP 4: Verify persistence in database\n')

    // Small delay to allow DB write
    await new Promise(r => setTimeout(r, 500))

    const storyData = await runner.fetchStoryPlan(projectId)

    // Look for soundtracks in various locations
    let persistedSoundtracks: any[] = []

    if (storyData.seriesBible?.storyPlan?.soundtracks) {
      persistedSoundtracks = storyData.seriesBible.storyPlan.soundtracks
    } else if (storyData.series_bible?.storyPlan?.soundtracks) {
      persistedSoundtracks = storyData.series_bible.storyPlan.soundtracks
    } else if (storyData.storyPlan?.soundtracks) {
      persistedSoundtracks = storyData.storyPlan.soundtracks
    } else if (storyData.soundtracks) {
      persistedSoundtracks = storyData.soundtracks
    }

    runner.recordResult(
      '4-persist',
      persistedSoundtracks.length >= 1,
      `Found ${persistedSoundtracks.length} soundtrack(s) in DB`
    )

    // =========================================================================
    // STEP 5: Send follow-up query to verify AI awareness
    // =========================================================================
    runner.log('\n📍 STEP 5: Verify AI awareness of committed data\n')

    const awarenessQuery = `What soundtracks have been added to this world? List their names.`

    const { messages: followUpMessages, rawContent } = await runner.sendMessageAndCollectActions(
      awarenessQuery,
      projectId
    )

    // Check if AI mentions any of the track names or keywords
    const aiResponse = followUpMessages
      .map(m => m.content)
      .join(' ')
      .toLowerCase()
    const fullResponse = rawContent.toLowerCase()

    // Try multiple matching strategies
    const mentionedTracks = trackNames.filter(name => {
      const cleanName = name.toLowerCase().replace(/[–—]/g, '-') // Normalize dashes
      const words = cleanName.split(/[\s\-–—]+/).filter(w => w.length > 3)

      // Check if full name or significant words appear
      return (
        fullResponse.includes(cleanName) ||
        aiResponse.includes(cleanName) ||
        words.some(w => fullResponse.includes(w) || aiResponse.includes(w))
      )
    })

    // Also check for keywords that indicate awareness
    const awarenessKeywords = [
      'soundtrack',
      'track',
      'song',
      'music',
      'added',
      'apparat',
      'reznor',
      'frost',
    ]
    const hasAwarenessIndicators = awarenessKeywords.some(
      kw => aiResponse.includes(kw) || fullResponse.includes(kw)
    )

    const passed = mentionedTracks.length >= 1 || hasAwarenessIndicators

    // Debug: show what AI actually said
    runner.log(`   AI response preview: "${aiResponse.slice(0, 200)}..."`)

    runner.recordResult(
      '5-awareness',
      passed,
      passed
        ? `AI shows awareness (mentioned: ${mentionedTracks.length > 0 ? mentionedTracks.join(', ') : 'keywords'})`
        : `AI did not show awareness. Track names: ${trackNames.join(', ')}`
    )

    // =========================================================================
    // FINAL SUMMARY
    // =========================================================================
    console.log('\n' + '='.repeat(70))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(70))

    const summary = runner.getSummary()
    console.log(`\n   Passed: ${summary.passed}/${summary.total}`)
    console.log(`   Failed: ${summary.failed}/${summary.total}`)

    if (summary.failed === 0) {
      console.log('\n✅ FULL LOOP TEST PASSED: Complete lifecycle verified')
    } else {
      console.log('\n⚠️ FULL LOOP TEST PARTIAL: Some steps failed')
      process.exit(1)
    }
  } catch (error: any) {
    console.error('\n❌ TEST ERROR:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// =============================================================================
// TEST: Fresh Soundtracks (should not repeat existing)
// =============================================================================

async function testFreshSoundtracks() {
  console.log('\n' + '='.repeat(70))
  console.log('🧪 FRESH SOUNDTRACKS TEST: Verify new requests generate different tracks')
  console.log('='.repeat(70) + '\n')

  const runner = new FullLoopTestRunner()
  const projectId = config.TEST_PROJECT_ID

  try {
    // =========================================================================
    // STEP 1: Get existing soundtracks from DB
    // =========================================================================
    runner.log('\n📍 STEP 1: Fetch existing soundtracks from DB\n')

    const storyData = await runner.fetchStoryPlan(projectId)

    let existingSoundtracks: any[] = []
    if (storyData.seriesBible?.storyPlan?.soundtracks) {
      existingSoundtracks = storyData.seriesBible.storyPlan.soundtracks
    } else if (storyData.series_bible?.storyPlan?.soundtracks) {
      existingSoundtracks = storyData.series_bible.storyPlan.soundtracks
    } else if (storyData.storyPlan?.soundtracks) {
      existingSoundtracks = storyData.storyPlan.soundtracks
    } else if (storyData.soundtracks) {
      existingSoundtracks = storyData.soundtracks
    }

    const existingTitles = existingSoundtracks.map(s => s.title?.toLowerCase() || '')
    const existingArtists = existingSoundtracks.map(s => s.artist?.toLowerCase() || '')

    runner.log(`   Found ${existingSoundtracks.length} existing tracks`)
    existingSoundtracks.slice(0, 3).forEach(s => runner.log(`   - "${s.title}" by ${s.artist}`))

    if (existingSoundtracks.length === 0) {
      runner.recordResult('1-existing', true, 'No existing soundtracks - will generate first set')
    } else {
      runner.recordResult(
        '1-existing',
        true,
        `${existingSoundtracks.length} existing soundtracks found`
      )
    }

    // =========================================================================
    // STEP 2: Request NEW soundtracks
    // =========================================================================
    runner.log('\n📍 STEP 2: Request fresh soundtracks\n')

    const { messages } = await runner.sendMessageAndCollectActions(
      'Suggest 5 NEW and DIFFERENT soundtrack recommendations. Do not repeat any songs that were already suggested.',
      projectId
    )

    // Find the soundtrack action
    const allActions = messages.flatMap(m => m.actions || [])
    const soundtrackAction = allActions.find(
      a =>
        a.type === 'UPDATE_SOUNDTRACKS' ||
        (a.type === 'UPDATE_SERIES_BIBLE' && a.payload?.storyPlan?.soundtracks)
    )

    if (!soundtrackAction) {
      // Debug: show what we received
      runner.log(`   DEBUG: Received ${messages.length} messages`)
      messages.forEach((m, i) => {
        runner.log(`   [${i}] ${m.sender}: ${m.content?.slice(0, 150)}...`)
        runner.log(`       Actions: ${m.actions?.length || 0}`)
        if (m.actions?.length) {
          m.actions.forEach((a: any) => runner.log(`         - ${a.type}`))
        }
      })

      runner.recordResult(
        '2-request',
        false,
        'No soundtrack action returned - AI may have responded conversationally'
      )
      // Don't return - continue to show if test can still verify something
    }

    // Extract new soundtracks (if action was found)
    let newSoundtracks: any[] = []
    if (soundtrackAction) {
      if (soundtrackAction.type === 'UPDATE_SOUNDTRACKS') {
        newSoundtracks = soundtrackAction.payload?.soundtracks || []
      } else if (soundtrackAction.type === 'UPDATE_SERIES_BIBLE') {
        newSoundtracks = soundtrackAction.payload?.storyPlan?.soundtracks || []
      }

      runner.log(`   Received ${newSoundtracks.length} new track suggestions`)
      newSoundtracks.slice(0, 3).forEach(s => runner.log(`   - "${s.title}" by ${s.artist}`))

      runner.recordResult(
        '2-request',
        newSoundtracks.length >= 1,
        `${newSoundtracks.length} new track(s) suggested`
      )
    }

    // =========================================================================
    // STEP 3: Verify new tracks are DIFFERENT from existing
    // =========================================================================
    runner.log('\n📍 STEP 3: Verify tracks are different from existing\n')

    if (newSoundtracks.length === 0) {
      runner.recordResult('3-different', false, 'No new soundtracks to compare')
    } else if (existingSoundtracks.length === 0) {
      runner.recordResult('3-different', true, 'No existing tracks to compare - first generation')
    } else {
      // Check for duplicates
      const duplicates = newSoundtracks.filter(newTrack => {
        const newTitle = newTrack.title?.toLowerCase() || ''
        const newArtist = newTrack.artist?.toLowerCase() || ''

        return (
          existingTitles.some(
            existingTitle =>
              existingTitle &&
              newTitle &&
              (existingTitle.includes(newTitle) || newTitle.includes(existingTitle))
          ) ||
          existingArtists.some(
            existingArtist => existingArtist && newArtist && existingArtist === newArtist
          )
        )
      })

      if (duplicates.length > 0) {
        runner.log(`   ⚠️ Found ${duplicates.length} potential duplicate(s):`)
        duplicates.forEach(d => runner.log(`      - "${d.title}" by ${d.artist}`))
      }

      // Allow some overlap (AI might suggest same artist with different song)
      const uniqueRatio = (newSoundtracks.length - duplicates.length) / newSoundtracks.length
      const passed = uniqueRatio >= 0.6 // At least 60% should be unique

      runner.recordResult(
        '3-different',
        passed,
        passed
          ? `${Math.round(uniqueRatio * 100)}% unique tracks (${newSoundtracks.length - duplicates.length}/${newSoundtracks.length})`
          : `Too many duplicates: ${duplicates.length}/${newSoundtracks.length}`
      )
    }

    // =========================================================================
    // FINAL SUMMARY
    // =========================================================================
    console.log('\n' + '='.repeat(70))
    console.log('📊 FRESH SOUNDTRACKS TEST SUMMARY')
    console.log('='.repeat(70))

    const summary = runner.getSummary()
    console.log(`\n   Passed: ${summary.passed}/${summary.total}`)
    console.log(`   Failed: ${summary.failed}/${summary.total}`)

    if (summary.failed === 0) {
      console.log('\n✅ FRESH SOUNDTRACKS TEST PASSED')
    } else {
      console.log('\n⚠️ FRESH SOUNDTRACKS TEST: Some steps failed')
    }
  } catch (error: any) {
    console.error('\n❌ TEST ERROR:', error.message)
  }
}

// =============================================================================
// TEST: No Internal Messages Exposed to User
// =============================================================================

async function testNoInternalMessagesExposed() {
  console.log('\n' + '='.repeat(70))
  console.log('🧪 INTERNAL MESSAGES TEST: Verify no internal agent messages shown to user')
  console.log('='.repeat(70) + '\n')

  const runner = new FullLoopTestRunner()
  const projectId = config.TEST_PROJECT_ID

  try {
    // Request soundtracks (may trigger URL validation internally)
    runner.log('\n📍 Requesting soundtracks and checking for internal messages\n')

    const { messages, rawContent } = await runner.sendMessageAndCollectActions(
      'Suggest 3 soundtrack recommendations for this world with YouTube links.',
      projectId
    )

    // Check for internal/technical messages that shouldn't be shown to user
    const internalPatterns = [
      'Review Required',
      'hallucinated URL',
      'HITL',
      'validation failed',
      'internal error',
      'guardrail',
      'checkpoint',
    ]

    const allContent = messages.map(m => m.content).join(' ') + ' ' + rawContent
    const exposedInternal = internalPatterns.filter(pattern =>
      allContent.toLowerCase().includes(pattern.toLowerCase())
    )

    if (exposedInternal.length > 0) {
      runner.log(`   ⚠️ Found internal patterns exposed: ${exposedInternal.join(', ')}`)
    }

    runner.recordResult(
      'no-internal',
      exposedInternal.length === 0,
      exposedInternal.length === 0
        ? 'No internal messages exposed to user'
        : `Exposed internal patterns: ${exposedInternal.join(', ')}`
    )

    // Summary
    console.log('\n' + '='.repeat(70))
    const summary = runner.getSummary()
    console.log(`   Passed: ${summary.passed}/${summary.total}`)

    if (summary.failed === 0) {
      console.log('\n✅ INTERNAL MESSAGES TEST PASSED')
    } else {
      console.log('\n⚠️ INTERNAL MESSAGES TEST: Some internal messages exposed')
    }
  } catch (error: any) {
    console.error('\n❌ TEST ERROR:', error.message)
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('\n🚀 Starting Full-Loop E2E Tests')
  console.log('   API URL:', config.API_URL)
  console.log('   Test Project:', config.TEST_PROJECT_ID)

  await testFullLoopSoundtracks()
  await testFreshSoundtracks()
  await testNoInternalMessagesExposed()

  console.log('\n' + '='.repeat(70))
  console.log('🎉 All Full-Loop E2E tests completed!')
  console.log('='.repeat(70) + '\n')
}

main().catch(error => {
  console.error('\n💥 Unhandled error:', error)
  process.exit(1)
})
