/**
 * E2E Tests for Beat Creation Flow
 *
 * Tests the full flow: Request beats → Supervisor delegates → Plot Architect creates → User approves
 */

import { StorytellerTestRunner as TestRunner } from '../runner'

const TEST_CONFIG = {
  testName: 'Beat Creation E2E',
  projectName: 'Beat Test Project',
  episodeName: 'Beat Test Episode',
}

async function runBeatTests() {
  const runner = new TestRunner(TEST_CONFIG.testName)

  console.log('\n🧪 Starting Beat Creation E2E Tests\n')
  console.log('='.repeat(60))

  try {
    // Test 1: Request beats from premise
    await testBeatGeneration(runner)

    // Test 2: Beat approval flow
    await testBeatApproval(runner)

    // Test 3: Multiple beats creation
    await testMultipleBeats(runner)

    runner.printSummary()
  } catch (error) {
    console.error('\n❌ Test suite failed:', error)
    process.exit(1)
  }
}

async function testBeatGeneration(runner: TestRunner) {
  console.log('\n📋 Test 1: Beat Generation from Premise')
  console.log('-'.repeat(60))

  try {
    const projectId = await runner.createProject(TEST_CONFIG.projectName)
    const episodeId = await runner.createEpisode(projectId, TEST_CONFIG.episodeName)

    console.log('  → Requesting beat generation')
    const { messages } = await runner.sendMessageAndCollectActions(
      'Generate a story beat for the opening',
      projectId,
      episodeId
    )

    // Verify supervisor delegated to Plot Architect
    const hasDelegation = messages.some(
      m =>
        m.content?.includes('Plot Architect') ||
        m.sender === 'PlotArchitect' ||
        m.sender === 'plotArchitect'
    )

    if (hasDelegation) {
      console.log('  ✅ Supervisor delegated to Plot Architect')
      runner.recordSuccess('Beat generation delegation working')
    } else {
      console.log('  ❌ Supervisor did not delegate properly')
      runner.recordFailure('Beat generation delegation failed')
    }

    // Verify CREATE_BEAT action was created
    const beatAction = messages.flatMap(m => m.actions || []).find(a => a.type === 'CREATE_BEAT')

    if (beatAction) {
      console.log('  ✅ CREATE_BEAT action found')
      console.log(`      Logline: ${beatAction.payload?.logline?.slice(0, 60)}...`)
      runner.recordSuccess('CREATE_BEAT action generated')
    } else {
      console.log('  ❌ No CREATE_BEAT action found')
      runner.recordFailure('CREATE_BEAT action not generated')
    }
  } catch (error) {
    console.error('  ❌ Test failed:', error)
    runner.recordFailure('Beat generation test failed')
  }
}

async function testBeatApproval(runner: TestRunner) {
  console.log('\n📋 Test 2: Beat Approval Flow')
  console.log('-'.repeat(60))

  try {
    const projectId = await runner.createProject(`${TEST_CONFIG.projectName} - Approval`)
    const episodeId = await runner.createEpisode(projectId, TEST_CONFIG.episodeName)

    // Generate beat
    const { messages } = await runner.sendMessageAndCollectActions(
      'Create an opening beat',
      projectId,
      episodeId
    )

    const beatAction = messages.flatMap(m => m.actions || []).find(a => a.type === 'CREATE_BEAT')

    if (!beatAction) {
      console.log('  ⚠️  No beat to approve, skipping')
      runner.recordFailure('No beat action to approve')
      return
    }

    console.log('  → Approving beat')
    const approvalResult = await runner.approveAction(beatAction, projectId, episodeId)

    if (approvalResult.success) {
      console.log('  ✅ Beat approved successfully')
      runner.recordSuccess('Beat approval working')
    } else {
      console.log('  ❌ Beat approval failed:', approvalResult.error)
      runner.recordFailure('Beat approval failed')
    }
  } catch (error) {
    console.error('  ❌ Test failed:', error)
    runner.recordFailure('Beat approval test failed')
  }
}

async function testMultipleBeats(runner: TestRunner) {
  console.log('\n📋 Test 3: Multiple Beats Creation')
  console.log('-'.repeat(60))

  try {
    const projectId = await runner.createProject(`${TEST_CONFIG.projectName} - Multiple`)
    const episodeId = await runner.createEpisode(projectId, TEST_CONFIG.episodeName)

    console.log('  → Requesting 3 beats')
    const { messages } = await runner.sendMessageAndCollectActions(
      'Generate 3 story beats for this episode',
      projectId,
      episodeId
    )

    const beatActions = messages.flatMap(m => m.actions || []).filter(a => a.type === 'CREATE_BEAT')

    console.log(`  📊 Found ${beatActions.length} CREATE_BEAT actions`)

    if (beatActions.length >= 1) {
      console.log('  ✅ At least 1 beat created')
      runner.recordSuccess(`${beatActions.length} beat(s) created`)
    } else {
      console.log('  ❌ No beats created')
      runner.recordFailure('Multiple beats creation failed')
    }
  } catch (error) {
    console.error('  ❌ Test failed:', error)
    runner.recordFailure('Multiple beats test failed')
  }
}

runBeatTests().catch(console.error)
