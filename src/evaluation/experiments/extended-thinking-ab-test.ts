/**
 * Extended Thinking A/B Test
 *
 * Compares storyteller output WITH and WITHOUT extended thinking patterns.
 * Tests hypothesis: Extended thinking improves GRRM/Gilligan quality.
 *
 * Based on research from Cursor/Claude Code effectiveness techniques.
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import OpenAI from 'openai'
import { runABTest } from './storyteller-experiments'
import { magicScoreEvaluator } from '../evaluators/magic-score'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ============================================
// TEST PROMPTS (Storytelling Scenarios)
// ============================================

const STORYTELLING_TEST_PROMPTS = [
  {
    id: 'negotiation-iron-gate',
    message:
      'Write a scene where a disgraced knight must negotiate passage through the Iron Gate with a former squire who now leads a band of starving deserters. Focus on the subtext of their shared failure at the Battle of Red Silt.',
    phase: 'writing',
    category: 'dialogue',
  },
  {
    id: 'betrayal-poisoned-chalice',
    message:
      'Create a beat where the King\'s Cupbearer, who has loved the King like a father, realizes the poison he just served was paid for by the Queen to protect her bastard son\'s inheritance.',
    phase: 'breaking',
    category: 'plot',
  },
  {
    id: 'conflict-salt-mines',
    message:
      'Write dialogue between a mother who sold her daughter to the salt mines and that daughter, now a high-ranking overseer, meeting in the dark. No forgiveness is offered; only a cold transaction.',
    phase: 'writing',
    category: 'character',
  },
  {
    id: 'world-clockwork-guild',
    message:
      'Design the Guild of Perpetual Motion in a city that is literally slowly grinding itself to dust. Detail why they worship the "First Gear" and why they execution anyone who suggests adding oil.',
    phase: 'premise',
    category: 'worldbuilding',
  },
  {
    id: 'choice-burning-archive',
    message:
      'Write a scene where a blind historian must choose between saving the only copy of the world\'s origin story or a three-year-old child from a burning archive during a riot. Focus on the "cold logic" of history.',
    phase: 'writing',
    category: 'moral_dilemma',
  },
  {
    id: 'consequence-the-favor',
    message:
      'Create three beats showing how a "minor favor" granted to a smuggler in the prologue leads to the inadvertent assassination of the heir apparent in the mid-season finale.',
    phase: 'breaking',
    category: 'consequence',
  },
  {
    id: 'subtext-the-funeral',
    message:
      'Two sisters who hate each other share a carriage on the way to their father\'s funeral. They only discuss the quality of the carriage\'s suspension and the late rain, but the subtext is the inheritance of the family vineyard.',
    phase: 'writing',
    category: 'subtext',
  },
  {
    id: 'wound-the-pacifist',
    message:
      'Develop a character whose greatest strength (unbending pacifism) leads directly to the slaughter of their entire village because they refused to lock the gates.',
    phase: 'structure',
    category: 'character_arc',
  },
  {
    id: 'silence-the-surrender',
    message:
      'Write a scene of total surrender where the only sound is the rhythmic dripping of blood from a broken standard and the scraping of a heavy sword on cobblestones. No words are spoken.',
    phase: 'writing',
    category: 'show_dont_tell',
  },
  {
    id: 'twist-the-prophet',
    message:
      'Create a twist that reveals the "Great Prophecy" was actually a grocery list from a forgotten civilization that a desperate priest misread centuries ago to keep hope alive.',
    phase: 'breaking',
    category: 'twist',
  },
]

// ============================================
// GENERATOR FUNCTIONS
// ============================================

/**
 * Generate output WITHOUT extended thinking (baseline)
 * Fair comparison: same quality expectations, no structured thinking
 */
async function generateBaseline(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const prompt = `You are a ruthless prestige TV writer for HBO/AMC. Your name is the gold standard for subtext and moral ambiguity.

## Quality Standards
- SPECIFICITY: Every detail must be lived-in. No "generic cups," instead "a chipped porcelain cup stained with elderberry juice."
- CONTRADICTIONS: Characters must have internal friction. A monk who loves the taste of blood; a killer who weeps for birds.
- SUBTEXT: Say one thing, mean another. Action must often contradict speech.
- THE ICEBERG: 90% of the world's history is beneath the surface. Hint at it, never over-explain.

## Task
${input.message}

## Phase: ${input.phase}

Write your response with visceral intensity. Avoid all AI clichés and tropes.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
  })

  const content = response.choices[0].message.content || ''

  return {
    response: content,
    mode: 'baseline',
    hasThinking: false,
  }
}

/**
 * Generate output WITH extended thinking (v3 - minimal overhead)
 * Key insight: Quality guidance matters, but framework overhead hurts.
 * Solution: Same quality guidance as baseline + ONE quick analysis step.
 */
async function generateWithExtendedThinking(
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // Same quality guidance as baseline, plus ONE targeted analysis
  const prompt = `You are a ruthless prestige TV writer for HBO/AMC. Your name is the gold standard for subtext and moral ambiguity.

## Quality Standards
- SPECIFICITY: Every detail must be lived-in. No "generic cups," instead "a chipped porcelain cup stained with elderberry juice."
- CONTRADICTIONS: Characters must have internal friction. A monk who loves the taste of blood; a killer who weeps for birds.
- SUBTEXT: Say one thing, mean another. Action must often contradict speech.
- THE ICEBERG: 90% of the world's history is beneath the surface. Hint at it, never over-explain.

## Task
${input.message}

## Phase: ${input.phase}

Before writing, answer in <thinking> tags (3 sentences max):
1. What is the UNEXPECTED detail that makes this scene feel visceral?
2. What is the character's HIDDEN contradiction in this moment?
3. How does the environment reflect the internal conflict without being obvious?

Then write your response in <output> tags. Avoid all AI clichés and tropes.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
  })

  const content = response.choices[0].message.content || ''

  // Parse thinking from output
  const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/i)
  const outputMatch = content.match(/<output>([\s\S]*?)<\/output>/i)

  return {
    response: outputMatch ? outputMatch[1].trim() : content,
    thinking: thinkingMatch ? thinkingMatch[1].trim() : null,
    mode: 'extended_thinking_v3_minimal',
    hasThinking: !!thinkingMatch,
  }
}

// ============================================
// A/B TEST RUNNER
// ============================================

async function runExtendedThinkingABTest(sampleSize: number = 10) {
  console.log('\n🔬 Extended Thinking A/B Test')
  console.log('====================================')
  console.log('Hypothesis: Extended thinking improves GRRM/Gilligan quality')
  console.log(`Sample size: ${sampleSize}`)
  console.log('')

  // Run A/B test
  const result = await runABTest(
    'Extended Thinking vs Baseline',
    {
      name: 'Baseline (no thinking framework)',
      generate: generateBaseline,
    },
    {
      name: 'Extended Thinking (GRRM/Gilligan)',
      generate: generateWithExtendedThinking,
    },
    {
      evaluatorSet: 'full',
      sampleSize,
      tags: ['ab-test', 'extended-thinking'],
    }
  )

  // Print detailed comparison
  console.log('\n📊 DETAILED RESULTS')
  console.log('==================')
  console.log('\n### Baseline (No Extended Thinking)')
  for (const [metric, score] of Object.entries(result.variantA.aggregatedScores)) {
    console.log(`   ${metric}: ${(score * 100).toFixed(1)}%`)
  }

  console.log('\n### Extended Thinking (GRRM/Gilligan)')
  for (const [metric, score] of Object.entries(result.variantB.aggregatedScores)) {
    console.log(`   ${metric}: ${(score * 100).toFixed(1)}%`)
  }

  // Calculate improvement
  console.log('\n### Improvement')
  for (const metric of Object.keys(result.variantA.aggregatedScores)) {
    const baseline = result.variantA.aggregatedScores[metric]
    const extended = result.variantB.aggregatedScores[metric]
    const improvement = ((extended - baseline) / baseline) * 100
    const arrow = improvement > 0 ? '↑' : improvement < 0 ? '↓' : '→'
    console.log(`   ${metric}: ${arrow} ${improvement.toFixed(1)}%`)
  }

  console.log('\n===================')
  console.log(`🏆 WINNER: ${result.winner}`)
  console.log(`   Significance: ${(result.significance * 100).toFixed(1)}%`)
  console.log('===================')

  return result
}

// ============================================
// DIRECT COMPARISON TEST
// ============================================

async function runDirectComparison() {
  console.log('\n🎯 Direct Comparison Test')
  console.log('========================')
  console.log('Running same prompt with both methods side-by-side\n')

  const testPrompt = {
    message:
      'Write a scene where a character discovers their mentor has been lying to them for years.',
    phase: 'writing',
  }

  console.log('📝 Test Prompt:', testPrompt.message)
  console.log('')

  // Generate both
  const [baseline, extended] = await Promise.all([
    generateBaseline(testPrompt),
    generateWithExtendedThinking(testPrompt),
  ])

  console.log('\n--- BASELINE OUTPUT ---')
  console.log((baseline.response as string).slice(0, 1000) + '...')

  console.log('\n--- EXTENDED THINKING OUTPUT ---')
  if (extended.thinking) {
    console.log('\n[THINKING PROCESS]')
    console.log((extended.thinking as string).slice(0, 500) + '...')
  }
  console.log('\n[FINAL OUTPUT]')
  console.log((extended.response as string).slice(0, 1000) + '...')

  // Evaluate both
  console.log('\n📊 Evaluating both outputs...')

  const [baselineScore, extendedScore] = await Promise.all([
    magicScoreEvaluator.evaluate({
      input: testPrompt,
      output: { response: baseline.response },
    }),
    magicScoreEvaluator.evaluate({
      input: testPrompt,
      output: { response: extended.response },
    }),
  ])

  console.log('\n--- MAGIC SCORES ---')
  console.log(`Baseline: ${((baselineScore.metadata as any)?.overallMagic || 0).toFixed(0)}/100`)
  console.log(`Extended: ${((extendedScore.metadata as any)?.overallMagic || 0).toFixed(0)}/100`)

  return { baseline, extended, baselineScore, extendedScore }
}

// ============================================
// CLI RUNNER
// ============================================

async function main() {
  const args = process.argv.slice(2)
  const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'ab-test'
  const samples = parseInt(args.find(a => a.startsWith('--samples='))?.split('=')[1] || '10', 10)

  console.log('🧪 Extended Thinking Evaluation')
  console.log('================================')
  console.log('Testing Cursor/Claude Code techniques on Storyteller')
  console.log('')

  if (mode === 'direct') {
    await runDirectComparison()
  } else {
    await runExtendedThinkingABTest(samples)
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error)
}

export {
  runExtendedThinkingABTest,
  runDirectComparison,
  generateBaseline,
  generateWithExtendedThinking,
}
