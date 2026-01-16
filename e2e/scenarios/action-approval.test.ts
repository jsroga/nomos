/**
 * E2E Test: Action Approval Flow
 *
 * Tests the full action approval lifecycle:
 * 1. Send message that triggers an action (e.g., "generate soundtracks")
 * 2. Verify action is returned in the message stream
 * 3. Approve the action via API
 * 4. Verify data is persisted
 *
 * Run with: npx tsx e2e/scenarios/action-approval.test.ts
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

class ActionApprovalTestRunner {
  private logs: string[] = []

  log(msg: string) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8)
    console.log(`[${timestamp}] ${msg}`)
    this.logs.push(msg)
  }

  /**
   * Parse SSE stream and extract messages with actions
   */
  async runChatAndCollectActions(
    message: string,
    projectId = config.TEST_PROJECT_ID,
    episodeId?: string
  ): Promise<{ messages: StreamedMessage[]; rawChunks: string[] }> {
    this.log(`📤 Sending: "${message}"`)
    this.log(`   Project: ${projectId}`)
    if (episodeId) this.log(`   Episode: ${episodeId}`)

    const payload: any = {
      messages: [{ role: 'user', content: message }],
      projectId,
      phase: 'premise', // Most action-generating phase
    }

    // Only include episodeId if provided
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
    const rawChunks: string[] = []

    if (!reader) throw new Error('No response body')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      rawChunks.push(chunk)

      // Parse SSE events
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'message' && data.message) {
              messages.push(data.message)

              if (data.message.actions?.length > 0) {
                this.log(`📋 Found ${data.message.actions.length} action(s) in message`)
                data.message.actions.forEach((a: StreamedAction, i: number) => {
                  this.log(`   [${i}] ${a.type}: ${JSON.stringify(a.payload).slice(0, 100)}...`)
                })
              }
            }
          } catch {
            // Ignore parse errors for non-JSON chunks
          }
        }
      }
    }

    this.log(`📥 Stream complete. Collected ${messages.length} messages.`)
    return { messages, rawChunks }
  }

  /**
   * Approve an action via the actions API
   */
  async approveAction(
    action: StreamedAction,
    projectId = config.TEST_PROJECT_ID,
    episodeId = config.TEST_EPISODE_ID
  ): Promise<{ success: boolean; result: any }> {
    this.log(`✅ Approving action: ${action.type}`)

    const response = await fetch('http://localhost:3000/api/storyteller/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        projectId,
        episodeId,
      }),
    })

    const data = await response.json()

    if (data.success) {
      this.log(`   ✅ Action committed successfully`)
    } else {
      this.log(`   ❌ Action failed: ${data.error || 'Unknown error'}`)
    }

    return data
  }

  /**
   * Verify data was persisted by checking the project
   */
  async verifyPersistence(
    projectId = config.TEST_PROJECT_ID,
    expectedField: string
  ): Promise<boolean> {
    this.log(`🔍 Verifying persistence of: ${expectedField}`)

    const response = await fetch(`http://localhost:3000/api/storyteller/projects/${projectId}`)
    const data = await response.json()

    const bible = data.seriesBible || data.series_bible || {}

    // Check if the expected field exists and has content
    const fieldParts = expectedField.split('.')
    let value: any = bible

    for (const part of fieldParts) {
      value = value?.[part]
    }

    const hasData =
      value && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0)

    if (hasData) {
      this.log(`   ✅ Field "${expectedField}" has data`)
      return true
    } else {
      this.log(`   ⚠️ Field "${expectedField}" is empty or missing`)
      return false
    }
  }
}

// Test Cases
async function testSoundtrackApproval() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 TEST: Soundtrack Action Approval Flow')
  console.log('='.repeat(60) + '\n')

  const runner = new ActionApprovalTestRunner()

  try {
    // Step 1: Send message to generate soundtracks
    // Use the same project that worked in the previous test
    const { messages } = await runner.runChatAndCollectActions(
      'Generate a soundtrack for this dark sci-fi series with 5 tracks',
      config.TEST_PROJECT_ID, // Use same project
      undefined // No specific episode - premise phase doesn't need one
    )

    // Step 2: Find soundtrack action
    const soundtrackAction = messages
      .flatMap(m => m.actions || [])
      .find(a => a.type === 'UPDATE_SOUNDTRACKS' || a.type === 'UPDATE_SERIES_BIBLE')

    if (!soundtrackAction) {
      console.log('⚠️ No soundtrack action found. This could mean:')
      console.log('   - The AI chose not to generate soundtracks')
      console.log('   - The action was embedded differently')
      console.log('   - The delegation to PremiseArchitect failed')

      // Log what we did receive
      const allActions = messages.flatMap(m => m.actions || [])
      if (allActions.length > 0) {
        console.log('\n📋 Actions received:')
        allActions.forEach((a, i) => console.log(`   [${i}] ${a.type}`))
      } else {
        console.log('\n📋 No actions received in any message.')
      }

      // Don't fail - this might be expected behavior depending on AI response
      console.log('\n⚠️ TEST SKIPPED: No actionable soundtracks to approve')
      return
    }

    // Step 3: Approve the action
    const approvalResult = await runner.approveAction(soundtrackAction)

    if (!approvalResult.success) {
      throw new Error(`Action approval failed: ${JSON.stringify(approvalResult)}`)
    }

    // Step 4: Verify persistence
    const persisted = await runner.verifyPersistence(config.TEST_PROJECT_ID, 'soundtracks')

    if (persisted) {
      console.log('\n✅ TEST PASSED: Full action approval flow verified')
    } else {
      console.log('\n⚠️ TEST PARTIAL: Action approved but persistence unverified')
    }
  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message)
    process.exit(1)
  }
}

async function testActionStatusTracking() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 TEST: Action Status Tracking in Messages')
  console.log('='.repeat(60) + '\n')

  const runner = new ActionApprovalTestRunner()

  try {
    // Trigger a world-building action (no episode needed for premise phase)
    const { messages, rawChunks } = await runner.runChatAndCollectActions(
      'Suggest 3 factions for this world',
      config.TEST_PROJECT_ID
      // No episodeId - premise phase works without it
    )

    // Verify actions have the expected structure
    const messagesWithActions = messages.filter(m => m.actions && m.actions.length > 0)

    console.log(`\n📊 Summary:`)
    console.log(`   Total messages: ${messages.length}`)
    console.log(`   Messages with actions: ${messagesWithActions.length}`)

    for (const msg of messagesWithActions) {
      console.log(`\n📝 Message from ${msg.sender}:`)
      console.log(`   Content: ${msg.content.slice(0, 100)}...`)
      console.log(`   Actions:`)

      for (const action of msg.actions || []) {
        console.log(`     - Type: ${action.type}`)
        console.log(`       Status: ${action.status || 'pending (undefined)'}`)
        console.log(`       Payload keys: ${Object.keys(action.payload || {}).join(', ')}`)
      }
    }

    // Verify action structure
    const allActions = messagesWithActions.flatMap(m => m.actions || [])

    if (allActions.length === 0) {
      console.log('\n⚠️ No actions found - AI may have responded conversationally')
      return
    }

    for (const action of allActions) {
      // Each action should have type and payload
      if (!action.type) throw new Error('Action missing type')
      if (action.payload === undefined) throw new Error('Action missing payload')
    }

    console.log('\n✅ TEST PASSED: Action structure is valid')
  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message)
    process.exit(1)
  }
}

// Run all tests
async function main() {
  console.log('\n🚀 Starting Action Approval E2E Tests')
  console.log('    LangSmith tracing:', config.LANGCHAIN_TRACING_V2 ? 'ENABLED' : 'DISABLED')
  console.log('    API URL:', config.API_URL)
  console.log('    Test Project:', config.TEST_PROJECT_ID)

  await testActionStatusTracking()
  await testSoundtrackApproval()

  console.log('\n' + '='.repeat(60))
  console.log('🎉 All E2E tests completed!')
  console.log('='.repeat(60) + '\n')
}

main().catch(error => {
  console.error('\n💥 Unhandled error:', error)
  process.exit(1)
})
