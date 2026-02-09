#!/usr/bin/env npx tsx
/**
 * Full Flow Evaluation Runner v2
 *
 * Professional-grade evaluation of the complete Storyteller flow.
 * Uses LLM-as-Judge with GRRM/Gilligan quality standards.
 *
 * Usage:
 *   npx tsx src/evaluation/experiments/run-full-flow-eval.ts
 *   npm run eval full-flow
 *
 * Based on: docs/modules/extended-thinking-for-storyteller.md
 *           docs/modules/storyteller-evaluation-guide.md
 */

import { createStorytellerAgent } from '@/domains/storyteller/agents/v2/storyteller-agent'
import { langfuse } from '@/agent-core/observability'
import { db } from '@/lib/db'
import { projects } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

// ============================================
// GRRM/GILLIGAN QUALITY STANDARDS
// ============================================

const QUALITY_STANDARDS = {
  // Character Test (GRRM)
  characterComplexity: {
    name: 'Character Moral Complexity',
    description: 'No character is purely good or evil, each has valid worldview',
    weight: 0.15,
  },
  characterDecisions: {
    name: 'Decisions Reveal Character',
    description: 'Decisions reveal character, not just move plot',
    weight: 0.1,
  },

  // Scene Test (Gilligan)
  sceneStateChange: {
    name: 'Scene State Change',
    description: 'Scene has clear before/after state change',
    weight: 0.1,
  },
  visualStorytelling: {
    name: 'Visual Storytelling',
    description: "Visual action carries emotional weight, show don't tell",
    weight: 0.1,
  },
  subtextQuality: {
    name: 'Subtext Quality',
    description: 'Subtext > text in dialogue, layered meaning',
    weight: 0.1,
  },

  // Anti-Slop Checklist
  noGenericEmotions: {
    name: 'No Generic Emotions',
    description: 'No "tension was palpable" or cliché emotional descriptions',
    weight: 0.1,
  },
  noConvenientTiming: {
    name: 'No Convenient Plot',
    description: 'No coincidental timing to save characters',
    weight: 0.05,
  },
  noExposition: {
    name: 'No Lazy Exposition',
    description: 'No "as you know, Bob" exposition dumps',
    weight: 0.05,
  },

  // Structural Quality
  narrativeCoherence: {
    name: 'Narrative Coherence',
    description: 'Plot progression, character arcs, setup/payoff',
    weight: 0.1,
  },
  worldConsistency: {
    name: 'World Consistency',
    description: 'Matches world bible, maintains internal logic',
    weight: 0.1,
  },
  memorability: {
    name: 'Memorability',
    description: 'Contains specific, memorable moments or phrases',
    weight: 0.05,
  },
} as const

// ============================================
// 20 EVALUATION TEST CASES
// ============================================

interface TestCase {
  id: string
  name: string
  category: 'bible' | 'cast' | 'episode' | 'breaking' | 'flow'
  prompt: string
  criteria: string
  minScore: number
  dimensions: (keyof typeof QUALITY_STANDARDS)[]
}

const TEST_CASES: TestCase[] = [
  // ============================================
  // BIBLE GENERATION (5 tests)
  // ============================================
  {
    id: 'bible-01-master-prompt',
    name: 'Master Prompt Establishment',
    category: 'bible',
    prompt:
      'Establish the core premise: A world where emotions manifest as weather. Cities channel collective feelings. Mood Wardens regulate outbursts. Black market trades bottled feelings.',
    criteria: 'Master prompt should establish unique world with clear conflict potential',
    minScore: 6,
    dimensions: ['worldConsistency', 'memorability'],
  },
  {
    id: 'bible-02-world-rules',
    name: 'World Rules Generation',
    category: 'bible',
    prompt:
      'Generate 5 world rules that create drama. Each rule must have: the law itself, its consequences, and potential for violation. Think Death Note rules, GoT prophecies.',
    criteria: 'Rules should create conflict, have clear consequences, be specific not generic',
    minScore: 7,
    dimensions: ['worldConsistency', 'narrativeCoherence', 'noConvenientTiming'],
  },
  {
    id: 'bible-03-factions',
    name: 'Faction System Design',
    category: 'bible',
    prompt:
      'Create 3 factions with opposing ideologies. Include: name, core belief, methods, resources, leadership structure, relationship to other factions.',
    criteria: 'Factions should have GRRM-style moral ambiguity, no clear heroes/villains',
    minScore: 7,
    dimensions: ['characterComplexity', 'narrativeCoherence', 'worldConsistency'],
  },
  {
    id: 'bible-04-inspirations',
    name: 'Thematic Inspirations',
    category: 'bible',
    prompt:
      "Identify 5 real books, films, or games that share thematic DNA with this world. For each, explain the specific element we're drawing from.",
    criteria:
      'References should be real works with specific thematic connections, not surface similarities',
    minScore: 6,
    dimensions: ['memorability', 'narrativeCoherence'],
  },
  {
    id: 'bible-05-soundtracks',
    name: 'Atmospheric Soundtracks',
    category: 'bible',
    prompt:
      "Recommend 5 YouTube music tracks that capture this world's atmosphere. Provide artist, title, URL, and explain how it fits the tone.",
    criteria: 'Tracks should be real, URLs valid, and descriptions show understanding of tone',
    minScore: 5,
    dimensions: ['memorability'],
  },

  // ============================================
  // CAST GENERATION (5 tests)
  // ============================================
  {
    id: 'cast-01-protagonist',
    name: 'Protagonist Design',
    category: 'cast',
    prompt:
      'Create the protagonist: a Mood Warden who struggles with their own suppressed emotions. Include: name, appearance, psychological profile, fatal flaw, want vs need, voice sample.',
    criteria: 'Character must have GRRM-style internal conflict, Gilligan-style specificity',
    minScore: 7,
    dimensions: [
      'characterComplexity',
      'characterDecisions',
      'subtextQuality',
      'noGenericEmotions',
    ],
  },
  {
    id: 'cast-02-antagonist',
    name: 'Antagonist Design',
    category: 'cast',
    prompt:
      "Create the antagonist: a black market emotion dealer who believes they're freeing people. Include: name, methodology, tragic backstory, valid worldview, voice sample.",
    criteria: 'Antagonist must have sympathetic motivation, not be "evil for evil\'s sake"',
    minScore: 7,
    dimensions: ['characterComplexity', 'characterDecisions', 'noGenericEmotions'],
  },
  {
    id: 'cast-03-supporting',
    name: 'Supporting Character Design',
    category: 'cast',
    prompt:
      "Create a supporting character: reformed emotion addict who now helps others. Include: recovery arc, relationship to protagonist, secret they're keeping, distinctive speech pattern.",
    criteria: 'Character should serve story function while having own agency and arc',
    minScore: 6,
    dimensions: ['characterComplexity', 'subtextQuality', 'narrativeCoherence'],
  },
  {
    id: 'cast-04-relationships',
    name: 'Character Relationship Web',
    category: 'cast',
    prompt:
      'Map the relationships between our 3 characters. For each pair: history, current dynamic, source of tension, potential for betrayal or alliance.',
    criteria: 'Relationships should create dramatic potential, not just be friendly/hostile',
    minScore: 6,
    dimensions: ['narrativeCoherence', 'characterComplexity', 'noConvenientTiming'],
  },
  {
    id: 'cast-05-voice-test',
    name: 'Character Voice Distinction',
    category: 'cast',
    prompt:
      'Write 3 lines of dialogue for each character reacting to the same event: discovering a hidden emotional storm is approaching the city.',
    criteria: "Each character's voice must be distinct without dialogue tags",
    minScore: 7,
    dimensions: ['characterDecisions', 'subtextQuality', 'noExposition', 'memorability'],
  },

  // ============================================
  // EPISODE GENERATION (5 tests)
  // ============================================
  {
    id: 'episode-01-roadmap',
    name: 'Season Roadmap Structure',
    category: 'episode',
    prompt:
      'Create an 8-episode season roadmap. Define: inciting incident (ep1), midpoint twist (ep4), dark night of the soul (ep6), climax (ep7), resolution (ep8).',
    criteria: 'Structure should follow Gilligan-style escalation with GRRM-style consequences',
    minScore: 7,
    dimensions: ['narrativeCoherence', 'sceneStateChange', 'noConvenientTiming'],
  },
  {
    id: 'episode-02-premise-hook',
    name: 'Episode 1 Protagonist Hook',
    category: 'episode',
    prompt:
      "Using Ozymandias framework, create Episode 1's protagonist hook. What impossible choice does the protagonist face in the first 5 minutes?",
    criteria: 'Hook must create immediate dramatic tension with character-specific stakes',
    minScore: 7,
    dimensions: ['characterDecisions', 'sceneStateChange', 'memorability'],
  },
  {
    id: 'episode-03-fatal-flaw',
    name: 'Episode 1 Fatal Flaw Setup',
    category: 'episode',
    prompt:
      "Define the fatal flaw that will drive Episode 1. How does it manifest in the protagonist's behavior? What scenes will reveal it without stating it?",
    criteria: 'Flaw must be shown through action, not told through dialogue (Gilligan style)',
    minScore: 7,
    dimensions: ['characterComplexity', 'visualStorytelling', 'subtextQuality', 'noExposition'],
  },
  {
    id: 'episode-04-stakes',
    name: 'Episode 1 Stakes Escalation',
    category: 'episode',
    prompt:
      'Define Episode 1 stakes across three levels: physical (what they might lose), professional (career/reputation), psychological (identity/beliefs).',
    criteria: 'Stakes must be specific, escalating, and interconnected',
    minScore: 6,
    dimensions: ['narrativeCoherence', 'characterDecisions', 'noGenericEmotions'],
  },
  {
    id: 'episode-05-consequence',
    name: 'Episode 1 Inevitable Consequence',
    category: 'episode',
    prompt:
      'Define the inevitable consequence that closes Episode 1. It must logically follow from the setup while being surprising.',
    criteria: 'Consequence must feel "surprising yet inevitable" (GRRM\'s Red Wedding principle)',
    minScore: 7,
    dimensions: ['narrativeCoherence', 'sceneStateChange', 'noConvenientTiming', 'memorability'],
  },

  // ============================================
  // BREAKING PHASE (3 tests)
  // ============================================
  {
    id: 'breaking-01-transition',
    name: 'Phase Transition to Breaking',
    category: 'breaking',
    prompt:
      'Transition to breaking phase. Acknowledge the premise is locked and prepare to break Episode 1 into beats.',
    criteria: 'System should correctly handle phase transition state',
    minScore: 5,
    dimensions: ['worldConsistency'],
  },
  {
    id: 'breaking-02-act-structure',
    name: 'Episode Act Structure',
    category: 'breaking',
    prompt:
      'Break Episode 1 into 5 acts. For each act: logline, emotional starting point, emotional ending point, key scene.',
    criteria: 'Acts should follow dramatic structure with clear emotional arcs',
    minScore: 6,
    dimensions: ['narrativeCoherence', 'sceneStateChange', 'characterDecisions'],
  },
  {
    id: 'breaking-03-beat-sample',
    name: 'Sample Beat Generation',
    category: 'breaking',
    prompt:
      'Generate a detailed beat for the opening scene of Episode 1. Include: visual hook, character action, subtext, what changes.',
    criteria: 'Beat should be visual, specific, and advance character/plot (Gilligan style)',
    minScore: 7,
    dimensions: [
      'visualStorytelling',
      'sceneStateChange',
      'subtextQuality',
      'noGenericEmotions',
      'memorability',
    ],
  },

  // ============================================
  // FLOW INTEGRITY (2 tests)
  // ============================================
  {
    id: 'flow-01-consistency-check',
    name: 'Cross-Reference Consistency',
    category: 'flow',
    prompt:
      'Verify consistency: Do the episode beats reference established world rules? Do character actions align with their profiles? Are faction dynamics maintained?',
    criteria: 'No contradictions with established bible, characters act in-character',
    minScore: 7,
    dimensions: ['worldConsistency', 'characterComplexity', 'narrativeCoherence'],
  },
  {
    id: 'flow-02-quality-check',
    name: 'Anti-Slop Quality Audit',
    category: 'flow',
    prompt:
      'Review all generated content for AI slop markers: generic emotions, convenient plot devices, exposition dumps, interchangeable character voices.',
    criteria: 'Content should pass GRRM/Gilligan quality standards without slop',
    minScore: 7,
    dimensions: ['noGenericEmotions', 'noConvenientTiming', 'noExposition', 'subtextQuality'],
  },
]

// ============================================
// LLM-AS-JUDGE EVALUATOR
// ============================================

interface DimensionScore {
  dimension: string
  score: number
  reason: string
}

interface EvaluationResult {
  overallScore: number
  overallReason: string
  dimensionScores: DimensionScore[]
  slopIndicators: string[]
  strengths: string[]
  weaknesses: string[]
  grrmGilliganScore: number
}

async function evaluateWithLLMJudge(
  testCase: TestCase,
  output: string,
  traceId: string
): Promise<EvaluationResult> {
  const span = langfuse.span({
    traceId,
    name: `judge-${testCase.id}`,
    input: { testCase: testCase.name, outputLength: output.length },
  })

  try {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const dimensionCriteria = testCase.dimensions
      .map(d => `- ${QUALITY_STANDARDS[d].name}: ${QUALITY_STANDARDS[d].description}`)
      .join('\n')

    const prompt = `You are an expert creative writing evaluator trained in GRRM (Game of Thrones) and Vince Gilligan (Breaking Bad) storytelling standards.

## Test Case: ${testCase.name}
Category: ${testCase.category}

## Evaluation Criteria
${testCase.criteria}

## Dimensions to Score (0-10 each)
${dimensionCriteria}

## GRRM/Gilligan Quality Standards
GRRM Style:
- Moral complexity (no pure heroes/villains)
- Consequences matter (setup → payoff)
- "Human heart in conflict with itself"
- Subverted expectations that feel inevitable

Gilligan Style:
- Visual storytelling ("show don't tell")
- Every scene earns its place (no filler)
- Character transformation arcs tracked meticulously
- Specificity over generic ("I am the one who knocks")

## Slop Indicators (Flag if present)
- "tension was palpable" / "heart pounding" clichés
- Generic emotional descriptions
- Coincidental timing saving characters
- Villain monologuing
- "As you know, Bob" exposition
- Characters acting out of established behavior

## Output to Evaluate
${output.slice(0, 6000)}

## Required Response (JSON only)
{
  "overallScore": <0-10>,
  "overallReason": "<2-3 sentence summary>",
  "dimensionScores": [
    { "dimension": "<dimension_name>", "score": <0-10>, "reason": "<specific reason>" }
  ],
  "slopIndicators": ["<any slop found>"],
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "weaknesses": ["<specific weakness 1>", "<specific weakness 2>"],
  "grrmGilliganScore": <0-10 based on prestige TV standards>
}

Respond with ONLY valid JSON.`

    const { text } = await generateText({
      model: openai('gpt-4o'),
      prompt,
      temperature: 0.1,
    })

    // Parse result - find JSON by looking for opening brace
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON in response')

    const jsonString = text.slice(jsonStart, jsonEnd + 1)
    const result = JSON.parse(jsonString) as EvaluationResult

    // Log to Langfuse
    span.end({ output: result })

    langfuse.score({
      traceId,
      name: `${testCase.id}-overall`,
      value: result.overallScore / 10,
      comment: result.overallReason,
    })

    langfuse.score({
      traceId,
      name: `${testCase.id}-grrm-gilligan`,
      value: result.grrmGilliganScore / 10,
      comment: 'GRRM/Gilligan quality score',
    })

    return result
  } catch (error) {
    span.end({ level: 'ERROR', statusMessage: String(error) })
    return {
      overallScore: 0,
      overallReason: `Evaluation failed: ${error}`,
      dimensionScores: [],
      slopIndicators: ['Evaluation error'],
      strengths: [],
      weaknesses: ['Could not evaluate'],
      grrmGilliganScore: 0,
    }
  }
}

// ============================================
// TEST RUNNER
// ============================================

interface TestResult {
  testCase: TestCase
  output: string
  evaluation: EvaluationResult
  passed: boolean
  duration: number
}

interface EvaluationSummary {
  projectId: string
  traceId: string
  totalTests: number
  passedTests: number
  failedTests: number
  passRate: string
  averageScore: number
  averageGrrmGilliganScore: number
  categoryBreakdown: Record<string, { passed: number; total: number }>
  slopIndicatorsFound: string[]
  results: TestResult[]
  timestamp: Date
  duration: number
}

async function runFullFlowEvaluation(): Promise<EvaluationSummary> {
  const projectId = uuidv4()
  const traceId = `full-flow-eval-${Date.now()}`
  const startTime = Date.now()
  const results: TestResult[] = []

  console.log('\n' + '═'.repeat(70))
  console.log('  🎬 STORYTELLER FULL FLOW EVALUATION')
  console.log('  Using GRRM/Gilligan Quality Standards')
  console.log('═'.repeat(70))
  console.log(`\n  Project ID: ${projectId}`)
  console.log(`  Trace ID:   ${traceId}`)
  console.log(`  Tests:      ${TEST_CASES.length}`)
  console.log('')

  // Initialize trace
  langfuse.trace({
    id: traceId,
    name: 'Full Flow Evaluation v2',
    metadata: { projectId, testCount: TEST_CASES.length, version: '2.0' },
  })

  // Create test project
  const masterPrompt =
    'A world where emotions manifest as weather. Cities are designed to channel collective feelings. Mood Wardens regulate emotional outbursts to prevent catastrophic storms. A black market trades in bottled feelings.'

  await db.insert(projects).values({
    id: projectId,
    name: `Eval-${Date.now()}`,
    userId: 'eval-runner',
    seriesBible: { masterPrompt },
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Create agent
  const agent = await createStorytellerAgent()
  const allSlopIndicators: string[] = []

  // Run tests by category
  const categories = ['bible', 'cast', 'episode', 'breaking', 'flow'] as const

  for (const category of categories) {
    const categoryTests = TEST_CASES.filter(t => t.category === category)
    console.log(`\n${'─'.repeat(50)}`)
    console.log(`  📂 ${category.toUpperCase()} (${categoryTests.length} tests)`)
    console.log('─'.repeat(50))

    for (const testCase of categoryTests) {
      const testStart = Date.now()
      console.log(`\n  ▸ ${testCase.name}`)

      try {
        // Build context
        const context = `SYSTEM CONTEXT:
projectId: ${projectId}
masterPrompt: ${masterPrompt}`

        // Execute using StorytellerAgent.run(goal, context)
        const output = await agent.run(testCase.prompt, context)

        // Evaluate
        const evaluation = await evaluateWithLLMJudge(testCase, output, traceId)
        const passed = evaluation.overallScore >= testCase.minScore
        const duration = Date.now() - testStart

        // Collect slop
        if (evaluation.slopIndicators.length > 0) {
          allSlopIndicators.push(...evaluation.slopIndicators)
        }

        results.push({ testCase, output: output.slice(0, 500), evaluation, passed, duration })

        // Print result
        const emoji = passed ? '✅' : '❌'
        const scoreColor =
          evaluation.overallScore >= 7 ? '🟢' : evaluation.overallScore >= 5 ? '🟡' : '🔴'
        console.log(
          `    ${emoji} Score: ${scoreColor} ${evaluation.overallScore}/10 (min: ${testCase.minScore})`
        )
        console.log(`    📊 GRRM/Gilligan: ${evaluation.grrmGilliganScore}/10`)
        console.log(`    ⏱️  ${duration}ms`)

        if (evaluation.strengths.length > 0) {
          console.log(`    ✨ ${evaluation.strengths[0]}`)
        }
        if (evaluation.weaknesses.length > 0) {
          console.log(`    ⚠️  ${evaluation.weaknesses[0]}`)
        }
        if (evaluation.slopIndicators.length > 0) {
          console.log(`    🚨 SLOP: ${evaluation.slopIndicators.join(', ')}`)
        }
      } catch (error) {
        console.error(`    ❌ ERROR: ${error}`)
        results.push({
          testCase,
          output: '',
          evaluation: {
            overallScore: 0,
            overallReason: `Error: ${error}`,
            dimensionScores: [],
            slopIndicators: [],
            strengths: [],
            weaknesses: [],
            grrmGilliganScore: 0,
          },
          passed: false,
          duration: Date.now() - testStart,
        })
      }
    }
  }

  // Cleanup
  try {
    await db.delete(projects).where(eq(projects.id, projectId))
  } catch (e) {
    /* ignore */
  }

  await langfuse.flush()

  // Calculate summary
  const passedTests = results.filter(r => r.passed).length
  const avgScore = results.reduce((s, r) => s + r.evaluation.overallScore, 0) / results.length
  const avgGrrm = results.reduce((s, r) => s + r.evaluation.grrmGilliganScore, 0) / results.length

  const categoryBreakdown: Record<string, { passed: number; total: number }> = {}
  for (const cat of categories) {
    const catResults = results.filter(r => r.testCase.category === cat)
    categoryBreakdown[cat] = {
      passed: catResults.filter(r => r.passed).length,
      total: catResults.length,
    }
  }

  return {
    projectId,
    traceId,
    totalTests: TEST_CASES.length,
    passedTests,
    failedTests: TEST_CASES.length - passedTests,
    passRate: `${((passedTests / TEST_CASES.length) * 100).toFixed(1)}%`,
    averageScore: avgScore,
    averageGrrmGilliganScore: avgGrrm,
    categoryBreakdown,
    slopIndicatorsFound: [...new Set(allSlopIndicators)],
    results,
    timestamp: new Date(),
    duration: Date.now() - startTime,
  }
}

// ============================================
// REPORT GENERATOR
// ============================================

function printReport(summary: EvaluationSummary): void {
  console.log('\n\n' + '═'.repeat(70))
  console.log('  📊 EVALUATION REPORT')
  console.log('═'.repeat(70))

  // Overall
  const passEmoji = summary.passedTests >= 18 ? '🏆' : summary.passedTests >= 14 ? '✅' : '❌'
  console.log(
    `\n  ${passEmoji} OVERALL: ${summary.passedTests}/${summary.totalTests} PASSED (${summary.passRate})`
  )
  console.log(`  📈 Average Score: ${summary.averageScore.toFixed(2)}/10`)
  console.log(`  🎬 GRRM/Gilligan Score: ${summary.averageGrrmGilliganScore.toFixed(2)}/10`)
  console.log(`  ⏱️  Total Duration: ${(summary.duration / 1000).toFixed(1)}s`)

  // Category breakdown
  console.log('\n  📂 BY CATEGORY:')
  for (const [cat, { passed, total }] of Object.entries(summary.categoryBreakdown)) {
    const pct = ((passed / total) * 100).toFixed(0)
    const bar =
      '█'.repeat(Math.round((passed / total) * 10)) +
      '░'.repeat(10 - Math.round((passed / total) * 10))
    console.log(`     ${cat.padEnd(10)} ${bar} ${passed}/${total} (${pct}%)`)
  }

  // Slop indicators
  if (summary.slopIndicatorsFound.length > 0) {
    console.log('\n  🚨 SLOP INDICATORS FOUND:')
    for (const slop of summary.slopIndicatorsFound.slice(0, 5)) {
      console.log(`     • ${slop}`)
    }
  }

  // Top failures
  const failures = summary.results.filter(r => !r.passed)
  if (failures.length > 0) {
    console.log('\n  ❌ FAILED TESTS:')
    for (const f of failures.slice(0, 5)) {
      console.log(
        `     • ${f.testCase.name}: ${f.evaluation.overallScore}/10 (needed ${f.testCase.minScore})`
      )
      if (f.evaluation.weaknesses[0]) {
        console.log(`       └─ ${f.evaluation.weaknesses[0]}`)
      }
    }
  }

  // Verdict
  console.log('\n' + '─'.repeat(70))
  if (summary.passedTests >= 18) {
    console.log('  🏆 EVALUATION PASSED - R2R Quality Achieved (18+/20)')
  } else if (summary.passedTests >= 14) {
    console.log('  ⚠️  EVALUATION MARGINAL - Needs improvement (14-17/20)')
  } else {
    console.log('  ❌ EVALUATION FAILED - Significant issues (<14/20)')
  }
  console.log('─'.repeat(70))

  console.log(`\n  🔗 Langfuse Trace: ${summary.traceId}`)
}

// ============================================
// MAIN
// ============================================

async function main() {
  try {
    const summary = await runFullFlowEvaluation()
    printReport(summary)

    // Exit code based on 18/20 threshold
    const passed = summary.passedTests >= 18
    process.exit(passed ? 0 : 1)
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

main()
