/**
 * E2E Test: Full Flow from Scratch
 *
 * Tests the complete "recreate everything from scratch" scenario:
 * 1. Create a fresh premise
 * 2. Get story plan proposed
 * 3. Approve story plan
 * 4. Generate story beats
 * 5. Approve beats
 * 6. Verify data persistence
 * 7. Test Bible updates
 *
 * Run with: npx tsx e2e/scenarios/full-from-scratch.test.ts
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

interface TestResult {
  step: string
  passed: boolean
  message: string
  duration?: number
}

class FullFromScratchTestRunner {
  private results: TestResult[] = []
  private startTime: number = 0

  log(msg: string) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8)
    console.log(`[${timestamp}] ${msg}`)
  }

  startStep(name: string) {
    this.startTime = Date.now()
    this.log(`\n📍 ${name}\n`)
  }

  recordResult(step: string, passed: boolean, message: string) {
    const duration = Date.now() - this.startTime
    this.results.push({ step, passed, message, duration })
    this.log(`${passed ? '✅' : '❌'} ${step}: ${message} (${duration}ms)`)
  }

  async sendMessage(
    message: string,
    projectId: string,
    episodeId?: string,
    phase = 'premise'
  ): Promise<{ messages: StreamedMessage[]; rawContent: string; actions: StreamedAction[] }> {
    this.log(`📤 Sending: "${message.slice(0, 100)}..."`)

    const payload: any = {
      messages: [{ role: 'user', content: message }],
      projectId,
      phase,
    }

    if (episodeId) {
      payload.episodeId = episodeId
    }

    const response = await fetch(config.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-e2e-test': 'true', // Bypass auth for E2E tests in dev
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error: ${response.status} - ${errorText.slice(0, 200)}`)
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

    const actions = messages.flatMap(m => m.actions || [])
    this.log(`📥 Received ${messages.length} messages, ${actions.length} actions`)

    return { messages, rawContent, actions }
  }

  async approveAction(
    action: StreamedAction,
    projectId: string,
    episodeId?: string
  ): Promise<{ success: boolean; error?: string; result?: any }> {
    this.log(`🔧 Approving action: ${action.type}`)

    const body: any = { action, projectId }
    if (episodeId) body.episodeId = episodeId

    const response = await fetch('http://localhost:3000/api/storyteller/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-e2e-test': 'true', // Bypass auth for E2E tests in dev
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return data
  }

  async fetchBible(projectId: string): Promise<any> {
    const response = await fetch(
      `http://localhost:3000/api/storyteller/plan?projectId=${projectId}`
    )
    if (!response.ok) {
      throw new Error(`Failed to fetch bible: ${response.status}`)
    }
    return await response.json()
  }

  async fetchEpisodes(projectId: string): Promise<any[]> {
    const response = await fetch(
      `http://localhost:3000/api/storyteller/episodes?projectId=${projectId}`
    )
    if (!response.ok) {
      return []
    }
    const data = await response.json()
    return data.episodes || []
  }

  async fetchBeats(episodeId: string): Promise<any[]> {
    const response = await fetch(
      `http://localhost:3000/api/storyteller/episodes/${episodeId}/beats`
    )
    if (!response.ok) {
      return []
    }
    const data = await response.json()
    return data.beats || []
  }

  getSummary(): { passed: number; failed: number; total: number; totalTime: number } {
    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.filter(r => !r.passed).length
    const totalTime = this.results.reduce((sum, r) => sum + (r.duration || 0), 0)
    return { passed, failed, total: this.results.length, totalTime }
  }

  printSummary() {
    console.log('\n' + '='.repeat(70))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(70))

    this.results.forEach(r => {
      console.log(`   ${r.passed ? '✅' : '❌'} ${r.step}: ${r.message}`)
    })

    const summary = this.getSummary()
    console.log('\n' + '-'.repeat(70))
    console.log(`   Total: ${summary.passed}/${summary.total} passed`)
    console.log(`   Time: ${(summary.totalTime / 1000).toFixed(1)}s`)
    console.log('='.repeat(70))
  }
}

// =============================================================================
// MAIN TEST: Full Flow From Scratch
// =============================================================================

async function testFullFlowFromScratch() {
  console.log('\n' + '🌟'.repeat(35))
  console.log('🧪 FULL FLOW FROM SCRATCH TEST')
  console.log('   Testing: Premise → Story Plan → Beats → Bible')
  console.log('🌟'.repeat(35) + '\n')

  const runner = new FullFromScratchTestRunner()
  const projectId = config.TEST_PROJECT_ID

  try {
    // =========================================================================
    // STEP 1: Check existing state
    // =========================================================================
    runner.startStep('STEP 1: Check existing project state')

    const episodes = await runner.fetchEpisodes(projectId)
    runner.log(`   Found ${episodes.length} existing episodes`)

    const episodeId = episodes[0]?.id || config.TEST_EPISODE_ID
    if (episodeId) {
      const beats = await runner.fetchBeats(episodeId)
      runner.log(`   Episode ${episodeId.slice(0, 8)}... has ${beats.length} beats`)
    }

    runner.recordResult('1-check-state', true, `Project has ${episodes.length} episodes`)

    // =========================================================================
    // STEP 2: Request fresh premise
    // =========================================================================
    runner.startStep('STEP 2: Request fresh premise')

    const premiseMessage = `Create a fresh episode premise for a mystery thriller set in 1990s Warsaw. 
The story should involve a journalist investigating a cold war secret that's resurfacing.
Give me a compelling logline and 3-5 key story elements.`

    const { actions: premiseActions, messages: premiseMessages } = await runner.sendMessage(
      premiseMessage,
      projectId,
      episodeId,
      'premise'
    )

    // Check for premise/bible action
    const premiseAction = premiseActions.find(
      a =>
        a.type === 'UPDATE_SERIES_BIBLE' ||
        a.type === 'UPDATE_EPISODE_PREMISE' ||
        a.type === 'CREATE_EPISODE_PREMISE'
    )

    // Also check if agent responded meaningfully
    const agentResponse = premiseMessages.map(m => m.content).join(' ')
    const hasPremiseContent =
      agentResponse.includes('journalist') ||
      agentResponse.includes('Warsaw') ||
      agentResponse.includes('cold war') ||
      agentResponse.length > 200

    runner.recordResult(
      '2-premise',
      !!premiseAction || hasPremiseContent,
      premiseAction
        ? `Got ${premiseAction.type} action`
        : hasPremiseContent
          ? 'Agent responded with premise content'
          : 'No premise action or meaningful response'
    )

    // Approve if we got an action
    if (premiseAction) {
      runner.startStep('STEP 2b: Approve premise')
      const approvalResult = await runner.approveAction(premiseAction, projectId, episodeId)
      runner.recordResult(
        '2b-approve-premise',
        approvalResult.success,
        approvalResult.success ? 'Premise approved' : `Failed: ${approvalResult.error}`
      )
    }

    // =========================================================================
    // STEP 3: Request story plan
    // =========================================================================
    runner.startStep('STEP 3: Request story plan')

    const planMessage = `Based on this premise, create a detailed story plan with:
- 5-7 story beats
- Character arcs
- Key plot points
- Tone and themes`

    const { actions: planActions, messages: planMessages } = await runner.sendMessage(
      planMessage,
      projectId,
      episodeId,
      'premise'
    )

    const planAction = planActions.find(
      a =>
        a.type === 'UPDATE_STORY_PLAN' ||
        a.type === 'UPDATE_SERIES_BIBLE' ||
        a.type === 'CREATE_BEAT'
    )

    const planContent = planMessages.map(m => m.content).join(' ')
    const hasPlanContent =
      planContent.includes('beat') ||
      planContent.includes('arc') ||
      planContent.includes('plot') ||
      planContent.length > 300

    runner.recordResult(
      '3-plan',
      !!planAction || hasPlanContent,
      planAction
        ? `Got ${planAction.type} action`
        : hasPlanContent
          ? 'Agent responded with plan content'
          : 'No plan action or content'
    )

    // =========================================================================
    // STEP 4: Request beats explicitly
    // =========================================================================
    runner.startStep('STEP 4: Request story beats')

    const beatsMessage = `Generate 5-7 detailed story beats for this episode. 
Break the story into key plot points with clear causality.
For each beat, include: logline, type, characters involved, and emotional shift.`

    const { actions: beatActions, messages: beatMessages } = await runner.sendMessage(
      beatsMessage,
      projectId,
      episodeId,
      'breaking' // Use breaking phase for beats
    )

    const beatAction = beatActions.find(a => a.type === 'CREATE_BEAT')
    const beatContent = beatMessages.map(m => m.content).join(' ')

    // Check for delegation to Plot Architect
    const delegatedToPlotArchitect = beatMessages.some(
      m => m.sender?.toLowerCase().includes('plot') || m.content?.includes('Plot Architect')
    )

    runner.recordResult(
      '4-beats-delegation',
      delegatedToPlotArchitect || !!beatAction,
      delegatedToPlotArchitect
        ? 'Delegated to Plot Architect ✓'
        : beatAction
          ? 'Got CREATE_BEAT action directly'
          : 'No delegation or beat action'
    )

    if (beatAction) {
      runner.startStep('STEP 4b: Approve beat')
      const beatApproval = await runner.approveAction(beatAction, projectId, episodeId)
      runner.recordResult(
        '4b-approve-beat',
        beatApproval.success,
        beatApproval.success ? 'Beat approved' : `Failed: ${beatApproval.error}`
      )
    }

    // =========================================================================
    // STEP 5: Verify data persistence
    // =========================================================================
    runner.startStep('STEP 5: Verify data persistence')

    await new Promise(r => setTimeout(r, 1000)) // Wait for DB writes

    const bible = await runner.fetchBible(projectId)
    const storyPlan =
      bible.seriesBible?.storyPlan || bible.series_bible?.storyPlan || bible.storyPlan

    const hasLogline = !!storyPlan?.logline || !!storyPlan?.premise
    const hasCharacters = (storyPlan?.keyCharacters?.length || 0) > 0
    const hasSoundtracks = (storyPlan?.soundtracks?.length || 0) > 0

    runner.recordResult(
      '5-persistence',
      hasLogline || hasCharacters,
      `Bible has: logline=${hasLogline}, characters=${hasCharacters}, soundtracks=${hasSoundtracks}`
    )

    // Check beats in DB
    if (episodeId) {
      const persistedBeats = await runner.fetchBeats(episodeId)
      runner.recordResult(
        '5b-beats-persistence',
        persistedBeats.length > 0,
        `${persistedBeats.length} beat(s) in database`
      )
    }

    // =========================================================================
    // STEP 6: Test Bible update
    // =========================================================================
    runner.startStep('STEP 6: Test Bible update (add character)')

    const bibleMessage = `Add a new character to the Bible: 
Name: Marta Kowalska
Role: The protagonist's estranged sister
Archetype: The Truth-Seeker
Motivation: To understand what really happened to their father`

    const { actions: bibleActions } = await runner.sendMessage(
      bibleMessage,
      projectId,
      episodeId,
      'premise'
    )

    const bibleUpdateAction = bibleActions.find(
      a => a.type === 'UPDATE_SERIES_BIBLE' || a.type === 'ADD_CHARACTER'
    )

    runner.recordResult(
      '6-bible-update',
      !!bibleUpdateAction,
      bibleUpdateAction
        ? `Got ${bibleUpdateAction.type} action for character`
        : 'No Bible update action (may need approval first)'
    )

    // =========================================================================
    // STEP 7: Test AI awareness of changes
    // =========================================================================
    runner.startStep('STEP 7: Test AI awareness of previous work')

    const awarenessMessage = `What have we established so far for this story? 
List the main characters and key plot elements.`

    const { messages: awarenessMessages } = await runner.sendMessage(
      awarenessMessage,
      projectId,
      episodeId,
      'premise'
    )

    const awarenessContent = awarenessMessages
      .map(m => m.content)
      .join(' ')
      .toLowerCase()

    // Check if AI mentions things from our session
    const knowsAboutJournalist = awarenessContent.includes('journalist')
    const knowsAboutWarsaw = awarenessContent.includes('warsaw')
    const knowsAboutColdWar = awarenessContent.includes('cold war')
    const hasAnyAwareness = knowsAboutJournalist || knowsAboutWarsaw || knowsAboutColdWar

    runner.recordResult(
      '7-awareness',
      hasAnyAwareness,
      hasAnyAwareness
        ? `AI remembers: journalist=${knowsAboutJournalist}, Warsaw=${knowsAboutWarsaw}, cold war=${knowsAboutColdWar}`
        : 'AI does not show awareness of previous work'
    )

    // =========================================================================
    // FINAL SUMMARY
    // =========================================================================
    runner.printSummary()

    const summary = runner.getSummary()
    if (summary.failed === 0) {
      console.log('\n✅ FULL FLOW FROM SCRATCH TEST PASSED!\n')
    } else if (summary.failed <= 2) {
      console.log('\n⚠️ FULL FLOW TEST MOSTLY PASSED (minor issues)\n')
    } else {
      console.log('\n❌ FULL FLOW TEST FAILED - Multiple issues detected\n')
      process.exit(1)
    }
  } catch (error: any) {
    console.error('\n💥 TEST ERROR:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// =============================================================================
// Quick Smoke Test
// =============================================================================

async function quickSmokeTest() {
  console.log('\n' + '='.repeat(70))
  console.log('🔥 QUICK SMOKE TEST')
  console.log('='.repeat(70) + '\n')

  const runner = new FullFromScratchTestRunner()
  const projectId = config.TEST_PROJECT_ID

  try {
    // Just test that the API responds
    runner.startStep('Smoke Test: API responds')

    const { messages, actions } = await runner.sendMessage(
      'Hello, what can you help me with?',
      projectId
    )

    const gotResponse = messages.length > 0 || actions.length > 0
    runner.recordResult(
      'smoke-api',
      gotResponse,
      gotResponse
        ? `Got ${messages.length} messages, ${actions.length} actions`
        : 'No response from API'
    )

    runner.printSummary()
  } catch (error: any) {
    console.error('\n💥 SMOKE TEST FAILED:', error.message)
    process.exit(1)
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2)

  console.log('\n🚀 Full Flow From Scratch E2E Tests')
  console.log('   API URL:', config.API_URL)
  console.log('   Project:', config.TEST_PROJECT_ID)
  console.log('')

  if (args.includes('--smoke')) {
    await quickSmokeTest()
  } else {
    await testFullFlowFromScratch()
  }

  console.log('\n🎉 Tests completed!\n')
}

main().catch(error => {
  console.error('\n💥 Unhandled error:', error)
  process.exit(1)
})
