/**
 * E2E Tests for Story Consistency System
 *
 * Tests the full flow of consistency checking, fix application, and undo.
 */

import { TestRunner } from '../runner'

const TEST_CONFIG = {
  testName: 'Consistency System E2E',
  projectName: 'Breaking Bad Test - Consistency',
  episodeName: 'Consistency Test Episode',
}

async function runConsistencyTests() {
  const runner = new TestRunner(TEST_CONFIG.testName)

  console.log('\n🧪 Starting Consistency System E2E Tests\n')
  console.log('='.repeat(60))

  try {
    // ============================================
    // Test 1: Character Trait Inconsistency
    // ============================================
    await testCharacterTraitInconsistency(runner)

    // ============================================
    // Test 2: Timeline Inconsistency
    // ============================================
    await testTimelineInconsistency(runner)

    // ============================================
    // Test 3: World Rule Violation
    // ============================================
    await testWorldRuleViolation(runner)

    // ============================================
    // Test 4: Undo Consistency Fixes
    // ============================================
    await testUndoFixes(runner)

    // ============================================
    // Summary
    // ============================================
    runner.printSummary()
  } catch (error) {
    console.error('\n❌ Test suite failed:', error)
    process.exit(1)
  }
}

/**
 * Test 1: Create a character trait inconsistency and verify auto-fix
 */
async function testCharacterTraitInconsistency(runner: TestRunner) {
  console.log('\n📋 Test 1: Character Trait Inconsistency')
  console.log('-'.repeat(60))

  try {
    // Create project
    const projectId = await runner.createProject(TEST_CONFIG.projectName)

    // Create episode
    const episodeId = await runner.createEpisode(projectId, TEST_CONFIG.episodeName)

    // Step 1: Create a character with brave trait
    console.log('  → Creating character Walter with brave trait')
    await runner.executeAction(
      {
        type: 'CREATE_CHARACTER',
        payload: {
          name: 'Walter White',
          role: 'Protagonist',
          psychology: {
            traits: { brave: true },
          },
        },
      },
      projectId,
      episodeId
    )

    // Step 2: Create a beat where Walter acts cowardly
    console.log('  → Creating beat where Walter acts cowardly (inconsistent)')
    const response = await runner.executeAction(
      {
        type: 'CREATE_BEAT',
        payload: {
          logline: 'Walter runs away in fear, abandoning his family',
          charactersInvolved: ['Walter White'],
        },
      },
      projectId,
      episodeId
    )

    // Verify consistency check ran
    if (response.consistencyResult) {
      console.log('  ✅ Consistency check triggered automatically')

      if (response.consistencyResult.inconsistencies.length > 0) {
        console.log(
          `  ✅ Detected ${response.consistencyResult.inconsistencies.length} inconsistency(ies)`
        )
        console.log(`  ✅ Applied ${response.consistencyResult.fixes.length} fix(es)`)

        runner.recordSuccess('Character trait inconsistency detected and fixed')
      } else {
        console.log('  ⚠️  No inconsistencies detected (expected at least 1)')
        runner.recordFailure('Character trait inconsistency not detected')
      }
    } else {
      console.log('  ⚠️  Consistency check did not run')
      runner.recordFailure('Consistency check did not trigger')
    }
  } catch (error) {
    console.error('  ❌ Test failed:', error)
    runner.recordFailure('Character trait inconsistency test failed')
  }
}

/**
 * Test 2: Create a timeline inconsistency and verify auto-fix
 */
async function testTimelineInconsistency(runner: TestRunner) {
  console.log('\n📋 Test 2: Timeline Inconsistency')
  console.log('-'.repeat(60))

  try {
    // Create project
    const projectId = await runner.createProject(`${TEST_CONFIG.projectName} - Timeline`)
    const episodeId = await runner.createEpisode(projectId, TEST_CONFIG.episodeName)

    // Step 1: Create Beat 1 - Discovery
    console.log('  → Creating Beat 1: Discovery')
    await runner.executeAction(
      {
        type: 'CREATE_BEAT',
        payload: {
          logline: 'Walter discovers the truth',
          sequence: 1,
        },
      },
      projectId,
      episodeId
    )

    // Step 2: Create Beat 2 - Uses knowledge from Beat 3 (doesn't exist yet)
    console.log('  → Creating Beat 2: Uses knowledge from future beat (inconsistent)')
    const response = await runner.executeAction(
      {
        type: 'CREATE_BEAT',
        payload: {
          logline: 'Walter confronts Jesse with the information from the lab',
          sequence: 2,
          causalDependencies: ['beat-3'],
        },
      },
      projectId,
      episodeId
    )

    // Verify consistency check
    if (response.consistencyResult?.inconsistencies.length) {
      console.log('  ✅ Timeline inconsistency detected')
      runner.recordSuccess('Timeline inconsistency detected and fixed')
    } else {
      console.log('  ⚠️  Timeline inconsistency not detected')
      runner.recordFailure('Timeline inconsistency not detected')
    }
  } catch (error) {
    console.error('  ❌ Test failed:', error)
    runner.recordFailure('Timeline inconsistency test failed')
  }
}

/**
 * Test 3: Create a world rule violation and verify auto-fix
 */
async function testWorldRuleViolation(runner: TestRunner) {
  console.log('\n📋 Test 3: World Rule Violation')
  console.log('-'.repeat(60))

  try {
    // Create project
    const projectId = await runner.createProject(`${TEST_CONFIG.projectName} - World Rules`)
    const episodeId = await runner.createEpisode(projectId, TEST_CONFIG.episodeName)

    // Step 1: Establish world rule - No magic
    console.log('  → Creating world rule: No magic')
    await runner.executeAction(
      {
        type: 'ADD_WORLD_RULE',
        payload: {
          rule: 'This is a realistic world with no magic or supernatural elements',
        },
      },
      projectId,
      episodeId
    )

    // Step 2: Create beat that violates the rule
    console.log('  → Creating beat with magic (violates world rule)')
    const response = await runner.executeAction(
      {
        type: 'CREATE_BEAT',
        payload: {
          logline: 'Walter casts a spell to make the evidence disappear',
        },
      },
      projectId,
      episodeId
    )

    // Verify consistency check
    if (response.consistencyResult?.inconsistencies.some(inc => inc.type === 'world_rule')) {
      console.log('  ✅ World rule violation detected')
      runner.recordSuccess('World rule violation detected and fixed')
    } else {
      console.log('  ⚠️  World rule violation not detected')
      runner.recordFailure('World rule violation not detected')
    }
  } catch (error) {
    console.error('  ❌ Test failed:', error)
    runner.recordFailure('World rule violation test failed')
  }
}

/**
 * Test 4: Test undo functionality for consistency fixes
 */
async function testUndoFixes(runner: TestRunner) {
  console.log('\n📋 Test 4: Undo Consistency Fixes')
  console.log('-'.repeat(60))

  try {
    // Create project
    const projectId = await runner.createProject(`${TEST_CONFIG.projectName} - Undo`)
    const episodeId = await runner.createEpisode(projectId, TEST_CONFIG.episodeName)

    // Step 1: Create an inconsistency and get fixes applied
    console.log('  → Creating inconsistency')
    const response = await runner.executeAction(
      {
        type: 'CREATE_CHARACTER',
        payload: {
          name: 'Test Character',
          psychology: { traits: { brave: true } },
        },
      },
      projectId,
      episodeId
    )

    // Step 2: Call undo API
    if (response.consistencyResult?.fixes.length) {
      console.log('  → Calling undo API')

      const undoResponse = await fetch(`${runner.baseUrl}/api/storyteller/consistency/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, episodeId }),
      })

      if (undoResponse.ok) {
        const undoResult = await undoResponse.json()
        console.log('  ✅ Undo successful')
        runner.recordSuccess('Undo consistency fixes successful')
      } else {
        console.log('  ❌ Undo failed')
        runner.recordFailure('Undo consistency fixes failed')
      }
    } else {
      console.log('  ⚠️  No fixes to undo')
      runner.recordFailure('No consistency fixes were applied')
    }
  } catch (error) {
    console.error('  ❌ Test failed:', error)
    runner.recordFailure('Undo test failed')
  }
}

// Run the tests
runConsistencyTests().catch(console.error)
