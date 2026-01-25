/**
 * Extended Thinking A/B Test
 *
 * Compares storyteller output WITH and WITHOUT extended thinking patterns.
 * Tests hypothesis: Extended thinking improves GRRM/Gilligan quality.
 *
 * Based on research from Cursor/Claude Code effectiveness techniques.
 */

// Load environment variables
import * as fs from 'fs'
import * as path from 'path'

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    content.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const cleanLine = trimmed.replace(/^export\s+/, '')
        const [key, ...valueParts] = cleanLine.split('=')
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=')
          value = value.replace(/^["']|["']$/g, '')
          process.env[key] = value
        }
      }
    })
    console.log('📂 Loaded environment from .env.local')
  }
}

loadEnvFile()

import { ChatOpenAI } from '@langchain/openai'
import { runABTest, runStorytellerExperiment, EVALUATOR_CONFIGS } from './storyteller-experiments'
import { magicScoreEvaluator } from '../evaluators/magic-score'
import { consistencyEvaluator } from '../evaluators/consistency'
import { narrativeCoherenceEvaluator } from '../evaluators/narrative-coherence'
import {
  EXTENDED_THINKING_FRAMEWORK,
  GRRM_GILLIGAN_STANDARDS,
  WRITER_THINKING_FRAMEWORK,
  CREATIVE_EXAMPLES,
} from '../../domains/storyteller/prompts/extended-thinking'

// ============================================
// TEST PROMPTS (Storytelling Scenarios)
// ============================================

const STORYTELLING_TEST_PROMPTS = [
  {
    id: 'scene-negotiation',
    message: 'Write a scene where a character negotiates for their life with someone who was once their friend.',
    phase: 'writing',
    category: 'dialogue',
  },
  {
    id: 'beat-betrayal',
    message: 'Create a beat where a trusted advisor is revealed to have been working against the protagonist.',
    phase: 'breaking',
    category: 'plot',
  },
  {
    id: 'character-conflict',
    message: 'Write dialogue between a parent who abandoned their child and that child, now adult, meeting for the first time.',
    phase: 'writing',
    category: 'character',
  },
  {
    id: 'world-faction',
    message: 'Design a faction that controls water in a desert world - their structure, goals, and internal conflicts.',
    phase: 'premise',
    category: 'worldbuilding',
  },
  {
    id: 'scene-choice',
    message: 'Write a scene where a character must choose between saving a stranger or pursuing their goal.',
    phase: 'writing',
    category: 'moral_dilemma',
  },
  {
    id: 'beat-consequence',
    message: 'Create three beats showing the ripple effects of a small lie told in episode one.',
    phase: 'breaking',
    category: 'consequence',
  },
  {
    id: 'dialogue-subtext',
    message: 'Write a conversation where two characters discuss the weather but are actually talking about their failing relationship.',
    phase: 'writing',
    category: 'subtext',
  },
  {
    id: 'character-wound',
    message: 'Develop a character whose greatest strength (their loyalty) becomes their greatest weakness.',
    phase: 'structure',
    category: 'character_arc',
  },
  {
    id: 'scene-silence',
    message: 'Write a scene that communicates profound emotion primarily through action and silence, with minimal dialogue.',
    phase: 'writing',
    category: 'show_dont_tell',
  },
  {
    id: 'twist-setup',
    message: 'Create a twist that recontextualizes everything we thought we knew about the mentor character.',
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
  const model = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0.8,
    openAIApiKey: process.env.OPENAI_API_KEY,
  })

  const prompt = `You are a prestige TV writer working at HBO/AMC standards.

Your writing should be:
- SPECIFIC, not generic (real details, not clichés)
- Character-driven (every person has contradictions)
- Full of subtext (what characters DON'T say matters)
- Consequential (actions have ripple effects)

AVOID generic phrases like "tension was palpable" or "heart pounded."

## Task
${input.message}

## Phase: ${input.phase}

Write your response directly. Make it memorable.`

  const response = await model.invoke(prompt)
  const content = typeof response.content === 'string' ? response.content : String(response.content)

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
async function generateWithExtendedThinking(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0.8,
    openAIApiKey: process.env.OPENAI_API_KEY,
  })

  // Same quality guidance as baseline, plus ONE targeted analysis
  const prompt = `You are a prestige TV writer working at HBO/AMC standards.

Your writing should be:
- SPECIFIC, not generic (real details, not clichés)
- Character-driven (every person has contradictions)
- Full of subtext (what characters DON'T say matters)
- Consequential (actions have ripple effects)

AVOID generic phrases like "tension was palpable" or "heart pounded."

## Task
${input.message}

## Phase: ${input.phase}

Before writing, answer in <thinking> tags (2-3 sentences max):
- What do the characters WANT that conflicts?
- What ONE specific detail will make this feel real?

Then write your response in <output> tags. Make it memorable.`

  const response = await model.invoke(prompt)
  const content = typeof response.content === 'string' ? response.content : String(response.content)

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
    message: 'Write a scene where a character discovers their mentor has been lying to them for years.',
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

export { runExtendedThinkingABTest, runDirectComparison, generateBaseline, generateWithExtendedThinking }
