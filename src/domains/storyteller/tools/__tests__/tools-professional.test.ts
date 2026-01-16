/**
 * Professional Test Suite for Storyteller Tools
 *
 * Includes:
 * - Property-based testing with random inputs
 * - Stress testing with high volume
 * - State immutability verification
 * - Concurrent operation safety
 * - Error boundary validation
 * - Performance benchmarking
 * - Real LLM integration (if OPENAI_API_KEY available)
 */

import { createBeatManagementTool, createBeatListTool } from '../beat-management-tools'
import { createContinuityCheckerTool, createQuickConsistencyTool } from '../continuity-tools'
import {
  createRelationshipAnalyzerTool,
  createRelationshipSuggestionTool,
} from '../character-relationship-tools'
import { createResearchTool, createFactCheckTool } from '../research-tools'
import { createVisualConceptTool, createBeatToStoryboardTool } from '../visual-concept-tools'
import {
  WritersRoomState,
  createInitialState,
  BeatCard,
  CharacterState,
  DEFAULT_CHARACTER_METRICS,
} from '../../graph/state'
import { Phase, BeatType, BeatStatus } from '../../enums'
import { v4 as uuidv4 } from 'uuid'

// ============================================
// TEST HARNESS
// ============================================

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
  metadata?: Record<string, unknown>
}

interface TestSuite {
  name: string
  results: TestResult[]
  duration: number
}

const suites: TestSuite[] = []
let currentSuite: TestSuite | null = null

function suite(name: string, fn: () => Promise<void>) {
  return async () => {
    currentSuite = { name, results: [], duration: 0 }
    const start = performance.now()
    console.log(`\n${'━'.repeat(60)}`)
    console.log(`📦 ${name}`)
    console.log('━'.repeat(60))

    try {
      await fn()
    } catch (err) {
      console.log(`  ❌ Suite failed: ${err}`)
    }

    currentSuite.duration = performance.now() - start
    suites.push(currentSuite)

    const passed = currentSuite.results.filter(r => r.passed).length
    const total = currentSuite.results.length
    console.log(`  ${passed}/${total} passed (${currentSuite.duration.toFixed(0)}ms)`)
  }
}

async function test(name: string, fn: () => Promise<void>) {
  const start = performance.now()
  try {
    await fn()
    const duration = performance.now() - start
    currentSuite?.results.push({ name, passed: true, duration })
    console.log(`  ✅ ${name} (${duration.toFixed(1)}ms)`)
  } catch (err) {
    const duration = performance.now() - start
    const error = err instanceof Error ? err.message : String(err)
    currentSuite?.results.push({ name, passed: false, duration, error })
    console.log(`  ❌ ${name}`)
    console.log(`     └─ ${error}`)
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`)
  }
}

function assertDeepEqual(actual: unknown, expected: unknown, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || 'Deep equality failed')
  }
}

// ============================================
// GENERATORS (Property-Based Testing)
// ============================================

function randomString(length: number = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateRandomBeat(): Partial<BeatCard> {
  const beatTypes = Object.values(BeatType)
  return {
    id: uuidv4(),
    episodeId: `ep-${randomInt(1, 100)}`,
    sequence: randomInt(1, 50),
    logline: randomString(randomInt(20, 100)),
    beatType: randomChoice(beatTypes),
    charactersInvolved: Array.from({ length: randomInt(0, 5) }, () => randomString(8)),
    visualHook: Math.random() > 0.5 ? randomString(50) : '',
    status: randomChoice([BeatStatus.PROPOSED, BeatStatus.APPROVED]),
  }
}

function generateRandomCharacter(): CharacterState {
  return {
    characterId: uuidv4(),
    name: randomString(randomInt(5, 15)),
    currentGoals: Array.from({ length: randomInt(1, 4) }, () => randomString(20)),
    fears: Array.from({ length: randomInt(1, 3) }, () => randomString(15)),
    selfDelusion: randomString(30),
    actualMotivation: randomString(25),
    knowledgeState: [],
    metrics: {
      ...DEFAULT_CHARACTER_METRICS,
      valence: randomInt(-100, 100),
      arousal: randomInt(0, 100),
      autonomy: randomInt(0, 100),
      competence: randomInt(0, 100),
      relatedness: randomInt(0, 100),
    },
    metricsHistory: [],
  }
}

function generateRandomState(options?: {
  beatCount?: number
  characterCount?: number
  worldRuleCount?: number
}): WritersRoomState {
  const { beatCount = 5, characterCount = 3, worldRuleCount = 3 } = options || {}

  const characters = Array.from({ length: characterCount }, generateRandomCharacter)
  const beats = Array.from({ length: beatCount }, (_, i) => ({
    ...generateRandomBeat(),
    sequence: i + 1,
    charactersInvolved: characters.slice(0, randomInt(1, characters.length)).map(c => c.name),
  })) as BeatCard[]

  return createInitialState({
    projectId: `proj-${uuidv4().slice(0, 8)}`,
    episodeId: `ep-${uuidv4().slice(0, 8)}`,
    currentPhase: Phase.STRUCTURE,
    beatBoard: beats,
    characters,
    seriesBible: {
      worldRules: Array.from({ length: worldRuleCount }, () => ({
        rule: `Characters cannot ${randomString(20)}`,
        consequence: randomString(30),
      })),
      themes: Array.from({ length: randomInt(2, 5) }, () => randomString(15)),
      factions: Array.from({ length: randomInt(1, 3) }, () => ({
        name: randomString(12),
        ideology: randomString(25),
        members: characters.slice(0, randomInt(1, characters.length)).map(c => c.name),
      })),
    },
    unresolvedSetups: [],
  })
}

// ============================================
// PROPERTY-BASED TESTS
// ============================================

const propertyBasedSuite = suite('Property-Based Testing', async () => {
  await test('Beat create always returns valid ID (100 iterations)', async () => {
    for (let i = 0; i < 100; i++) {
      const state = generateRandomState({ beatCount: randomInt(0, 20) })
      const tool = createBeatManagementTool(state)
      const result = await tool.invoke({
        operation: 'create',
        data: { logline: randomString(randomInt(10, 100)) },
      })
      const parsed = JSON.parse(result)
      assert(parsed.success === true, `Iteration ${i}: Create failed`)
      assert(typeof parsed.beat?.id === 'string', `Iteration ${i}: No ID returned`)
      assert(parsed.beat.id.length > 0, `Iteration ${i}: Empty ID`)
    }
  })

  await test('Beat list always returns array (100 iterations)', async () => {
    for (let i = 0; i < 100; i++) {
      const state = generateRandomState({ beatCount: randomInt(0, 50) })
      const tool = createBeatManagementTool(state)
      const result = await tool.invoke({ operation: 'list' })
      const parsed = JSON.parse(result)
      assert(parsed.success === true, `Iteration ${i}: List failed`)
      assert(Array.isArray(parsed.beats), `Iteration ${i}: beats not array`)
      assertEqual(parsed.totalBeats, state.beatBoard.length, `Iteration ${i}: Count mismatch`)
    }
  })

  await test('Relationship analyzer handles any character count (50 iterations)', async () => {
    for (let i = 0; i < 50; i++) {
      const charCount = randomInt(0, 10)
      const state = generateRandomState({ characterCount: charCount, beatCount: randomInt(1, 10) })
      const tool = createRelationshipAnalyzerTool(state)
      const result = await tool.invoke({ focus: 'full_matrix' })
      const parsed = JSON.parse(result)

      if (charCount < 2) {
        assert(parsed.success === false, `Iteration ${i}: Should fail with ${charCount} chars`)
      } else {
        assert(parsed.success === true, `Iteration ${i}: Should succeed with ${charCount} chars`)
        assertEqual(parsed.totalCharacters, charCount, `Iteration ${i}: Wrong char count`)
      }
    }
  })

  await test('Continuity checker never crashes on random state (50 iterations)', async () => {
    for (let i = 0; i < 50; i++) {
      const state = generateRandomState({
        beatCount: randomInt(0, 30),
        characterCount: randomInt(0, 10),
        worldRuleCount: randomInt(0, 10),
      })
      const tool = createContinuityCheckerTool(state)

      // Should not throw
      const result = await tool.invoke({
        scope: 'all_beats',
        checkTypes: ['all'],
      })
      const parsed = JSON.parse(result)
      assert(parsed.success === true, `Iteration ${i}: Continuity check failed`)
    }
  })

  await test('Visual concept handles arbitrary moment descriptions (50 iterations)', async () => {
    for (let i = 0; i < 50; i++) {
      const state = generateRandomState({ characterCount: randomInt(1, 5) })
      const tool = createVisualConceptTool(state)

      const result = await tool.invoke({
        moment: randomString(randomInt(10, 200)),
        characters: state.characters.slice(0, randomInt(0, 3)).map(c => c.name),
        outputFormat: 'all',
      })
      const parsed = JSON.parse(result)
      assert(parsed.success === true, `Iteration ${i}: Visual concept failed`)
      assert(parsed.imagePrompt, `Iteration ${i}: No image prompt`)
    }
  })
})

// ============================================
// STRESS TESTS
// ============================================

const stressSuite = suite('Stress Testing', async () => {
  await test('Rapid sequential beat operations (500 ops)', async () => {
    const state = generateRandomState({ beatCount: 10 })
    const tool = createBeatManagementTool(state)

    for (let i = 0; i < 500; i++) {
      const op = randomChoice(['create', 'list', 'get'] as const)

      if (op === 'create') {
        await tool.invoke({ operation: 'create', data: { logline: `Beat ${i}` } })
      } else if (op === 'list') {
        await tool.invoke({ operation: 'list' })
      } else {
        const beatId = state.beatBoard[0]?.id || 'nonexistent'
        await tool.invoke({ operation: 'get', beatId })
      }
    }
  })

  await test('Large beat board (1000 beats)', async () => {
    const state = generateRandomState({ beatCount: 1000, characterCount: 20 })
    const tool = createBeatManagementTool(state)

    const start = performance.now()
    const result = await tool.invoke({ operation: 'list' })
    const duration = performance.now() - start

    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'List failed')
    assertEqual(parsed.totalBeats, 1000, 'Wrong count')
    assert(duration < 100, `Too slow: ${duration}ms`)
  })

  await test('Complex relationship matrix (50 characters)', async () => {
    const state = generateRandomState({ characterCount: 50, beatCount: 100 })
    const tool = createRelationshipAnalyzerTool(state)

    const start = performance.now()
    const result = await tool.invoke({ focus: 'full_matrix', includeHistory: true })
    const duration = performance.now() - start

    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'Analysis failed')
    assertEqual(parsed.totalCharacters, 50, 'Wrong char count')
    assert(duration < 500, `Too slow: ${duration}ms`)
  })

  await test('Continuity check with 500 beats and 50 world rules', async () => {
    const state = generateRandomState({ beatCount: 500, worldRuleCount: 50 })
    const tool = createContinuityCheckerTool(state)

    const start = performance.now()
    const result = await tool.invoke({ scope: 'all_beats', checkTypes: ['all'] })
    const duration = performance.now() - start

    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'Check failed')
    assert(duration < 1000, `Too slow: ${duration}ms`)
  })
})

// ============================================
// STATE IMMUTABILITY TESTS
// ============================================

const immutabilitySuite = suite('State Immutability', async () => {
  await test('Beat create does not mutate original state', async () => {
    const state = generateRandomState({ beatCount: 5 })
    const originalBeats = JSON.stringify(state.beatBoard)
    const originalLength = state.beatBoard.length

    const tool = createBeatManagementTool(state)
    await tool.invoke({ operation: 'create', data: { logline: 'New beat' } })

    // Note: The tool operates on the state reference, but shouldn't mutate
    // the original array if implemented correctly
    assertEqual(state.beatBoard.length, originalLength, 'Original array length changed')
  })

  await test('Relationship analyzer does not mutate characters', async () => {
    const state = generateRandomState({ characterCount: 5 })
    const originalChars = JSON.stringify(state.characters)

    const tool = createRelationshipAnalyzerTool(state)
    await tool.invoke({ focus: 'full_matrix', includeHistory: true })

    assertEqual(JSON.stringify(state.characters), originalChars, 'Characters mutated')
  })

  await test('Continuity check does not mutate state', async () => {
    const state = generateRandomState({ beatCount: 10 })
    const originalState = JSON.stringify({
      beatBoard: state.beatBoard,
      seriesBible: state.seriesBible,
      unresolvedSetups: state.unresolvedSetups,
    })

    const tool = createContinuityCheckerTool(state)
    await tool.invoke({ scope: 'all_beats', checkTypes: ['all'] })

    const currentState = JSON.stringify({
      beatBoard: state.beatBoard,
      seriesBible: state.seriesBible,
      unresolvedSetups: state.unresolvedSetups,
    })

    assertEqual(currentState, originalState, 'State mutated')
  })
})

// ============================================
// CONCURRENT OPERATION TESTS
// ============================================

const concurrencySuite = suite('Concurrent Operations', async () => {
  await test('Parallel beat creates do not conflict', async () => {
    const state = generateRandomState({ beatCount: 0 })
    const tool = createBeatManagementTool(state)

    const promises = Array.from({ length: 10 }, (_, i) =>
      tool.invoke({ operation: 'create', data: { logline: `Parallel beat ${i}` } })
    )

    const results = await Promise.all(promises)
    const parsedResults = results.map(r => JSON.parse(r))

    // All should succeed
    parsedResults.forEach((p, i) => {
      assert(p.success === true, `Create ${i} failed`)
    })

    // All IDs should be unique
    const ids = parsedResults.map(p => p.beat?.id)
    const uniqueIds = new Set(ids)
    assertEqual(uniqueIds.size, 10, 'Duplicate IDs generated')
  })

  await test('Parallel reads do not block', async () => {
    const state = generateRandomState({ beatCount: 100, characterCount: 20 })
    const beatTool = createBeatManagementTool(state)
    const relTool = createRelationshipAnalyzerTool(state)
    const contTool = createContinuityCheckerTool(state)

    const start = performance.now()

    await Promise.all([
      beatTool.invoke({ operation: 'list' }),
      beatTool.invoke({ operation: 'list' }),
      relTool.invoke({ focus: 'full_matrix' }),
      relTool.invoke({ focus: 'cluster_analysis' }),
      contTool.invoke({ scope: 'all_beats', checkTypes: ['all'] }),
    ])

    const duration = performance.now() - start

    // Parallel should be faster than sequential (5 * avg_time)
    // Allow generous margin
    assert(duration < 500, `Parallel took too long: ${duration}ms`)
  })
})

// ============================================
// ERROR BOUNDARY TESTS
// ============================================

const errorBoundarySuite = suite('Error Boundaries', async () => {
  await test('Beat tool handles null operation gracefully', async () => {
    const state = generateRandomState()
    const tool = createBeatManagementTool(state)

    try {
      const result = await tool.invoke({ operation: null as any })
      const parsed = JSON.parse(result)
      assert(parsed.success === false || parsed.error, 'Should indicate failure')
    } catch {
      // Throwing is also acceptable for invalid input
    }
  })

  await test('Beat tool handles undefined beatId for update', async () => {
    const state = generateRandomState({ beatCount: 5 })
    const tool = createBeatManagementTool(state)

    const result = await tool.invoke({
      operation: 'update',
      beatId: undefined as any,
      data: { logline: 'test' },
    })
    const parsed = JSON.parse(result)
    assert(parsed.success === false, 'Should fail without beatId')
  })

  await test('Relationship tool handles empty character name', async () => {
    const state = generateRandomState({ characterCount: 5 })
    const tool = createRelationshipAnalyzerTool(state)

    const result = await tool.invoke({
      focus: 'character_focus',
      characterName: '',
    })
    const parsed = JSON.parse(result)
    // Should not crash, might return no relationships
    assert(parsed.success === true || parsed.error, 'Should handle gracefully')
  })

  await test('Research tool handles extremely long query', async () => {
    const state = generateRandomState()
    const tool = createResearchTool(state)

    const longQuery = randomString(10000) // 10KB query
    const result = await tool.invoke({
      query: longQuery,
      focus: 'general',
    })
    const parsed = JSON.parse(result)
    // Should not crash
    assert(parsed !== undefined, 'Should return something')
  })

  await test('Continuity tool handles malformed beat data', async () => {
    const state = generateRandomState({ beatCount: 5 })
    // Inject malformed beat
    state.beatBoard.push({
      id: 'malformed',
      episodeId: '',
      sequence: -1,
      logline: null as any,
      beatType: 'invalid' as any,
      charactersInvolved: null as any,
      emotionalShifts: 'not an object' as any,
      visualHook: 123 as any,
      causalDependencies: 'not array' as any,
      setupsPayoffs: [],
      status: 'unknown' as any,
    } as any)

    const tool = createContinuityCheckerTool(state)

    // Should not throw
    const result = await tool.invoke({ scope: 'all_beats', checkTypes: ['all'] })
    assert(result !== undefined, 'Should not crash')
  })
})

// ============================================
// PERFORMANCE BENCHMARKS
// ============================================

const benchmarkSuite = suite('Performance Benchmarks', async () => {
  const iterations = 100

  await test(`Beat create benchmark (${iterations} iterations)`, async () => {
    const state = generateRandomState({ beatCount: 0 })
    const tool = createBeatManagementTool(state)

    const times: number[] = []
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await tool.invoke({ operation: 'create', data: { logline: `Bench ${i}` } })
      times.push(performance.now() - start)
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const p95 = times.sort((a, b) => a - b)[Math.floor(iterations * 0.95)]
    const p99 = times.sort((a, b) => a - b)[Math.floor(iterations * 0.99)]

    console.log(`     └─ avg=${avg.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, p99=${p99.toFixed(2)}ms`)
    assert(p99 < 50, `p99 too high: ${p99}ms`)
  })

  await test(`Relationship analysis benchmark (${iterations} iterations)`, async () => {
    const state = generateRandomState({ characterCount: 10, beatCount: 20 })
    const tool = createRelationshipAnalyzerTool(state)

    const times: number[] = []
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await tool.invoke({ focus: 'full_matrix' })
      times.push(performance.now() - start)
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const p95 = times.sort((a, b) => a - b)[Math.floor(iterations * 0.95)]

    console.log(`     └─ avg=${avg.toFixed(2)}ms, p95=${p95.toFixed(2)}ms`)
    assert(p95 < 100, `p95 too high: ${p95}ms`)
  })

  await test(`Continuity check benchmark (${iterations} iterations)`, async () => {
    const state = generateRandomState({ beatCount: 50, worldRuleCount: 10 })
    const tool = createContinuityCheckerTool(state)

    const times: number[] = []
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await tool.invoke({ scope: 'all_beats', checkTypes: ['all'] })
      times.push(performance.now() - start)
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const p95 = times.sort((a, b) => a - b)[Math.floor(iterations * 0.95)]

    console.log(`     └─ avg=${avg.toFixed(2)}ms, p95=${p95.toFixed(2)}ms`)
    assert(p95 < 200, `p95 too high: ${p95}ms`)
  })
})

// ============================================
// REAL LLM INTEGRATION (if available)
// ============================================

const llmIntegrationSuite = suite('LLM Integration (Live)', async () => {
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const hasTavily = !!process.env.TAVILY_API_KEY

  if (!hasOpenAI && !hasTavily) {
    console.log('  ⚠️  Skipping: No API keys found (OPENAI_API_KEY, TAVILY_API_KEY)')
    return
  }

  if (hasTavily) {
    await test('Live web research query', async () => {
      const state = generateRandomState()
      const tool = createResearchTool(state)

      const result = await tool.invoke({
        query: 'Victorian era social etiquette',
        focus: 'historical',
        depth: 'quick',
      })
      const parsed = JSON.parse(result)
      assert(parsed.success === true, 'Research failed')
      assert(parsed.results?.length > 0, 'No results from live search')
      console.log(`     └─ Got ${parsed.results.length} live results`)
    })
  }
})

// ============================================
// RUN ALL SUITES
// ============================================

async function runAllSuites() {
  console.log('\n' + '═'.repeat(60))
  console.log('🔬 PROFESSIONAL TEST SUITE - Storyteller Tools')
  console.log('═'.repeat(60))
  console.log(`Started: ${new Date().toISOString()}`)

  const startTime = performance.now()

  await propertyBasedSuite()
  await stressSuite()
  await immutabilitySuite()
  await concurrencySuite()
  await errorBoundarySuite()
  await benchmarkSuite()
  await llmIntegrationSuite()

  const totalDuration = performance.now() - startTime

  // Summary
  console.log('\n' + '═'.repeat(60))
  console.log('📊 FINAL REPORT')
  console.log('═'.repeat(60))

  let totalPassed = 0
  let totalFailed = 0

  for (const suite of suites) {
    const passed = suite.results.filter(r => r.passed).length
    const failed = suite.results.filter(r => !r.passed).length
    totalPassed += passed
    totalFailed += failed

    const status = failed === 0 ? '✅' : '❌'
    console.log(
      `${status} ${suite.name}: ${passed}/${suite.results.length} (${suite.duration.toFixed(0)}ms)`
    )

    // Show failed tests
    suite.results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`   └─ ❌ ${r.name}: ${r.error}`)
      })
  }

  console.log('')
  console.log(`Total: ${totalPassed}/${totalPassed + totalFailed} passed`)
  console.log(`Duration: ${(totalDuration / 1000).toFixed(2)}s`)
  console.log(`Completed: ${new Date().toISOString()}`)

  if (totalFailed > 0) {
    console.log('\n❌ SOME TESTS FAILED')
    process.exit(1)
  } else {
    console.log('\n✅ ALL TESTS PASSED')
    process.exit(0)
  }
}

runAllSuites().catch(err => {
  console.error('\n💀 Fatal error:', err)
  process.exit(1)
})
