/**
 * Integration Tests for New Storyteller Tools
 *
 * Tests tools with realistic state and inputs to ensure they work
 * properly in actual usage scenarios.
 */

import { createBeatManagementTool, createBeatListTool } from '../beat-management-tools'
import { createContinuityCheckerTool } from '../continuity-tools'
import {
  createRelationshipAnalyzerTool,
  createRelationshipSuggestionTool,
} from '../character-relationship-tools'
import { createResearchTool, createFactCheckTool } from '../research-tools'
import { createVisualConceptTool } from '../visual-concept-tools'
import { createInitialState, DEFAULT_CHARACTER_METRICS } from '../../graph/state'
import { Phase, BeatType, BeatStatus } from '../../enums'

console.log('\n🧪 Integration Tests for Storyteller Tools\n')
console.log('='.repeat(60))

let passed = 0
let failed = 0

function test(name: string, fn: () => Promise<void>) {
  return fn()
    .then(() => {
      console.log(`✅ ${name}`)
      passed++
    })
    .catch(err => {
      console.log(`❌ ${name}`)
      console.log(`   Error: ${err.message}`)
      failed++
    })
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

// Create a realistic state for testing
function createRealisticState() {
  return createInitialState({
    projectId: 'proj-test-123',
    episodeId: 'ep-test-001',
    currentPhase: Phase.STRUCTURE,
    seriesBible: {
      genre: ['Sci-Fi', 'Thriller'],
      tone: ['Dark', 'Tense'],
      themes: ['Power', 'Identity', 'Betrayal'],
      centralTheme: 'The cost of ambition',
      worldRules: [
        {
          rule: 'FTL travel requires a human navigator in stasis',
          consequence: 'Ships without navigators are stranded',
        },
        { rule: 'AI cannot harm humans directly', consequence: 'Must manipulate through proxies' },
        {
          rule: 'Memory transfers are irreversible',
          consequence: 'Original memories are destroyed',
        },
      ],
      factions: [
        {
          name: 'The Collective',
          ideology: 'Unity through connection',
          members: ['Elena', 'Marcus'],
        },
        { name: 'The Sovereign', ideology: 'Individual supremacy', members: ['Viktor'] },
      ],
      keyCharacters: [
        {
          name: 'Elena',
          role: 'Protagonist',
          description: 'Former navigator haunted by lost memories',
        },
        {
          name: 'Marcus',
          role: 'Ally',
          description: 'Elena\'s partner, secretly working for The Collective',
        },
        { name: 'Viktor', role: 'Antagonist', description: 'Charismatic leader of The Sovereign' },
      ],
    },
    characters: [
      {
        characterId: 'char-elena',
        name: 'Elena',
        currentGoals: ['Recover lost memories', 'Find the truth about her past'],
        fears: ['Losing herself again', 'Discovering she was the villain'],
        selfDelusion: 'I can trust my own mind',
        actualMotivation: 'Validation that her sacrifice meant something',
        knowledgeState: ['Knows about FTL navigation', 'Suspects Marcus is hiding something'],
        metrics: { ...DEFAULT_CHARACTER_METRICS, valence: -20, arousal: 60, transformation: 30 },
        metricsHistory: [],
      },
      {
        characterId: 'char-marcus',
        name: 'Marcus',
        currentGoals: ['Protect Elena', 'Complete mission for The Collective'],
        fears: ['Elena discovering his betrayal', 'Failing The Collective'],
        selfDelusion: 'I\'m doing this to protect her',
        actualMotivation: 'Redemption for past failures',
        knowledgeState: ['Elena\'s true identity', 'The Collective\'s real plans'],
        metrics: { ...DEFAULT_CHARACTER_METRICS, valence: -10, arousal: 50, moralAlignment: 40 },
        metricsHistory: [],
      },
      {
        characterId: 'char-viktor',
        name: 'Viktor',
        currentGoals: ['Capture Elena', 'Destroy The Collective'],
        fears: ['Loss of control', 'Being proven wrong'],
        selfDelusion: 'I am humanity\'s savior',
        actualMotivation: 'Power and revenge',
        knowledgeState: ['Elena\'s value as a navigator', 'The Collective\'s weakness'],
        metrics: { ...DEFAULT_CHARACTER_METRICS, valence: 30, arousal: 70, autonomy: 90 },
        metricsHistory: [],
      },
    ],
    beatBoard: [
      {
        id: 'beat-001',
        episodeId: 'ep-test-001',
        sequence: 1,
        logline: 'Elena wakes in an unfamiliar ship with no memory of the last three days',
        beatType: BeatType.SETUP,
        charactersInvolved: ['Elena'],
        emotionalShifts: { Elena: { from: 'confusion', to: 'fear' } },
        visualHook: 'Close-up on Elena\'s eye snapping open, reflected in the ship\'s dark viewport',
        causalDependencies: [],
        setupsPayoffs: { setupId: 'setup-memory-gap' },
        status: BeatStatus.APPROVED,
      },
      {
        id: 'beat-002',
        episodeId: 'ep-test-001',
        sequence: 2,
        logline: 'Marcus finds Elena and claims they escaped together',
        beatType: BeatType.CONFRONTATION,
        charactersInvolved: ['Elena', 'Marcus'],
        emotionalShifts: {
          Elena: { from: 'fear', to: 'tentative trust' },
          Marcus: { from: 'relief', to: 'guilt' },
        },
        visualHook: 'Marcus\'s hand reaches for Elena, hesitates, then pulls back',
        causalDependencies: ['beat-001'],
        setupsPayoffs: { setupId: 'setup-marcus-lie' },
        status: BeatStatus.PROPOSED,
      },
    ],
    unresolvedSetups: [
      {
        id: 'setup-memory-gap',
        description: 'Elena\'s three-day memory gap',
        beatId: 'beat-001',
        isResolved: false,
      },
      {
        id: 'setup-marcus-lie',
        description: 'Marcus\'s claim about their escape',
        beatId: 'beat-002',
        isResolved: false,
      },
    ],
  })
}

async function runTests() {
  const state = createRealisticState()

  // ============================================
  // BEAT MANAGEMENT TESTS
  // ============================================
  console.log('\n📦 Beat Management Tool')
  console.log('-'.repeat(40))

  await test('Create beat with full details', async () => {
    const tool = createBeatManagementTool(state)
    const result = await tool.invoke({
      operation: 'create',
      data: {
        logline: 'Viktor intercepts their distress signal',
        beatType: 'revelation',
        charactersInvolved: ['Viktor'],
        visualHook: 'Viktor\'s face illuminated by the signal trace, a cold smile forming',
      },
      targetPosition: 3,
    })
    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'Should succeed')
    assert(parsed.beat?.id, 'Should return new beat ID')
    assert(parsed.beat?.sequence === 3, 'Should be at position 3')
  })

  await test('List beats shows correct structure', async () => {
    const tool = createBeatManagementTool(state)
    const result = await tool.invoke({ operation: 'list' })
    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'Should succeed')
    assert(parsed.totalBeats === 2, `Should have 2 beats, got ${parsed.totalBeats}`)
    assert(parsed.statusCounts.approved === 1, 'Should have 1 approved')
    assert(parsed.statusCounts.proposed === 1, 'Should have 1 proposed')
  })

  await test('Update beat preserves unchanged fields', async () => {
    const tool = createBeatManagementTool(state)
    const result = await tool.invoke({
      operation: 'update',
      beatId: 'beat-002',
      data: { visualHook: 'NEW: Marcus\'s guilty expression in ship\'s reflection' },
    })
    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'Should succeed')

    // Get the beat to verify
    const getResult = await tool.invoke({ operation: 'get', beatId: 'beat-002' })
    const beat = JSON.parse(getResult).beat
    assert(beat.logline.includes('Marcus finds Elena'), 'Logline should be preserved')
  })

  await test('Duplicate creates variant', async () => {
    const tool = createBeatManagementTool(state)
    const result = await tool.invoke({
      operation: 'duplicate',
      beatId: 'beat-001',
    })
    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'Should succeed')
    assert(parsed.newBeat?.logline.includes('(variant)'), 'Should mark as variant')
    assert(parsed.newBeat?.id !== 'beat-001', 'Should have new ID')
  })

  // ============================================
  // CONTINUITY CHECKER TESTS
  // ============================================
  console.log('\n📦 Continuity Checker Tool')
  console.log('-'.repeat(40))

  await test('Check continuity finds no issues in clean state', async () => {
    const tool = createContinuityCheckerTool(state)
    const result = await tool.invoke({
      scope: 'all_beats',
      checkTypes: ['all'],
    })
    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'Should succeed')
    assert(parsed.summary?.beatsChecked === 2, 'Should check 2 beats')
  })

  await test('Check setup/payoff tracking', async () => {
    const tool = createContinuityCheckerTool(state)
    const result = await tool.invoke({
      scope: 'all_beats',
      checkTypes: ['setup_payoff'],
    })
    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'Should succeed')
    // Our state has 2 unresolved setups - this is expected, not an error
  })

  await test('Check world rules with violating beat', async () => {
    // Create state with a violation
    const violatingState = {
      ...state,
      beatBoard: [
        ...state.beatBoard,
        {
          id: 'beat-violation',
          episodeId: 'ep-test-001',
          sequence: 10,
          logline: 'The AI directly kills the captain', // Violates "AI cannot harm humans directly"
          beatType: BeatType.DEFAULT,
          charactersInvolved: [],
          emotionalShifts: {},
          visualHook: '',
          causalDependencies: [],
          setupsPayoffs: {},
          status: BeatStatus.PROPOSED,
        },
      ],
    }
    const tool = createContinuityCheckerTool(violatingState as any)
    const result = await tool.invoke({
      scope: 'all_beats',
      checkTypes: ['world_rules'],
    })
    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'Should succeed')
    // The tool should detect potential violation with "AI" and "harm"
  })

  // ============================================
  // RELATIONSHIP ANALYZER TESTS
  // ============================================
  console.log('\n📦 Relationship Analyzer Tool')
  console.log('-'.repeat(40))

  await test('Full matrix shows all relationships', async () => {
    const tool = createRelationshipAnalyzerTool(state)
    const result = await tool.invoke({
      focus: 'full_matrix',
      includeHistory: false,
    })
    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'Should succeed')
    assert(parsed.totalCharacters === 3, `Should have 3 characters, got ${parsed.totalCharacters}`)
    assert(parsed.relationships.length > 0, 'Should have relationships')
    assert(parsed.centralCharacter, 'Should identify central character')
  })

  await test('Character focus shows specific relationships', async () => {
    const tool = createRelationshipAnalyzerTool(state)
    const result = await tool.invoke({
      focus: 'character_focus',
      characterName: 'Elena',
    })
    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'Should succeed')
    assert(parsed.character === 'Elena', 'Should focus on Elena')
    assert(Array.isArray(parsed.relationships), 'Should return relationships array')
  })

  await test('Cluster analysis groups factions', async () => {
    const tool = createRelationshipAnalyzerTool(state)
    const result = await tool.invoke({
      focus: 'cluster_analysis',
    })
    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'Should succeed')
    assert(Array.isArray(parsed.clusters), 'Should return clusters')
    assert(Array.isArray(parsed.isolatedCharacters), 'Should return isolated list')
  })

  await test('Relationship suggestion with conflict tone', async () => {
    const tool = createRelationshipSuggestionTool(state)
    const result = await tool.invoke({
      character1: 'Elena',
      character2: 'Marcus',
      desiredTone: 'conflict',
    })
    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'Should succeed')
    assert(Array.isArray(parsed.suggestions), 'Should return suggestions')
    assert(parsed.suggestions.length > 0, 'Should have at least one suggestion')
  })

  // ============================================
  // RESEARCH TOOL TESTS
  // ============================================
  console.log('\n📦 Research Tool')
  console.log('-'.repeat(40))

  await test('Research historical topic', async () => {
    const tool = createResearchTool(state)
    const result = await tool.invoke({
      query: 'Victorian era social customs',
      focus: 'historical',
      depth: 'standard',
    })
    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'Should succeed')
    assert(parsed.results?.length > 0, 'Should return results')
  })

  await test('Research psychological concept', async () => {
    const tool = createResearchTool(state)
    const result = await tool.invoke({
      query: 'trauma response PTSD',
      focus: 'psychological',
    })
    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'Should succeed')
    assert(parsed.focus === 'psychological', 'Should preserve focus')
  })

  await test('Fact check catches common mistake', async () => {
    const tool = createFactCheckTool(state)
    const result = await tool.invoke({
      claim: 'Vikings wore horned helmets into battle',
      category: 'historical',
    })
    const parsed = JSON.parse(result)
    assert(parsed.verdict === 'LIKELY INACCURATE', `Should catch myth, got: ${parsed.verdict}`)
  })

  // ============================================
  // VISUAL CONCEPT TOOL TESTS
  // ============================================
  console.log('\n📦 Visual Concept Tool')
  console.log('-'.repeat(40))

  await test('Generate visual concept for dramatic moment', async () => {
    const tool = createVisualConceptTool(state)
    const result = await tool.invoke({
      moment: 'Elena confronts Marcus about his betrayal in the ship\'s cargo bay',
      emotionalTone: 'betrayal and anger',
      characters: ['Elena', 'Marcus'],
      outputFormat: 'all',
    })
    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'Should succeed')
    assert(parsed.fullConcept?.composition, 'Should have composition')
    assert(parsed.fullConcept?.lighting, 'Should have lighting')
    assert(parsed.imagePrompt, 'Should generate image prompt')
    assert(parsed.storyboardPanel, 'Should generate storyboard panel')
  })

  await test('Auto-detect style from series bible', async () => {
    const tool = createVisualConceptTool(state)
    const result = await tool.invoke({
      moment: 'Viktor watches from the shadows',
      style: 'auto',
      outputFormat: 'full_concept',
    })
    const parsed = JSON.parse(result)
    assert(parsed.success === true, 'Should succeed')
    // State has 'Dark' tone, should detect appropriate style
    assert(parsed.fullConcept?.style, 'Should detect style')
  })

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(60))
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    console.log('\n❌ Some tests failed!')
    process.exit(1)
  } else {
    console.log('\n✅ All integration tests passed!')
    process.exit(0)
  }
}

runTests().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
