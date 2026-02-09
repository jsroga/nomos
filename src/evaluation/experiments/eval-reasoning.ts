import Anthropic from '@anthropic-ai/sdk'
import { runABTest } from './storyteller-experiments'
import * as fs from 'fs'
import * as path from 'path'
import { MultiVariantReport, VariantReport } from '../types'
import { saveABTestReport } from '../report-generator'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Helper for Dashboard JSON
function mapToVariantReport(run: any): VariantReport {
  return {
    name: run.name,
    config: run.config,
    overallMetrics: {
      magicScore: run.aggregatedScores['magic-score'] || 0,
      consistency: run.aggregatedScores['consistency'] || 0,
      orchestration: run.aggregatedScores['orchestration'] || 0,
      latencyMs: run.duration / run.results.length,
      costUsd: 0,
    },
    scenarioMetrics: {},
    exampleLogs: run.results.map((r: any) => ({
      id: r.exampleId,
      scenario: 'general',
      input: JSON.stringify(r.input),
      output: typeof r.output === 'string' ? r.output : JSON.stringify(r.output),
      score: r.scores['magic-score'] || 0,
      reasoning: r.reasoning,
      context: r.context, // Pass context to dashboard
    })),
  }
}

// 1. Zero-Shot Generator
async function generateZeroShot(input: Record<string, unknown>): Promise<unknown> {
  const systemPrompt = 'You are a master storyteller. Write the requested scene immediately.'

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1024,
    temperature: 0.7,
    system: systemPrompt,
    messages: [{ role: 'user', content: JSON.stringify(input) }],
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''

  return {
    response: content,
    // Expose the hidden system prompt to the dashboard
    context: {
      strategy: 'Zero-Shot',
      systemPrompt: systemPrompt,
      model: 'claude-3-haiku',
    },
  }
}

// 2. Chain-of-Thought Generator
async function generateCoT(input: Record<string, unknown>): Promise<unknown> {
  // Step 1: Planning
  const planPrompt =
    'You are a thoughtful writer. Before writing the story, outline 3 key narrative beats and the emotional arc. Output ONLY the plan.'
  const planRes = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1024,
    temperature: 0.7,
    system: planPrompt,
    messages: [{ role: 'user', content: JSON.stringify(input) }],
  })
  const plan = planRes.content[0].type === 'text' ? planRes.content[0].text : ''

  // Step 2: Writing
  const writePrompt = 'Now, write the story based on the plan. Be vivid and engaging.'
  const storyRes = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1024,
    temperature: 0.7,
    system: writePrompt,
    messages: [{ role: 'user', content: `REQ: ${JSON.stringify(input)}\n\nPLAN:\n${plan}` }],
  })
  const story = storyRes.content[0].type === 'text' ? storyRes.content[0].text : ''

  return {
    response: story,
    // Expose the hidden thought process
    context: {
      strategy: 'Chain-of-Thought',
      step1_Plan: plan,
      step2_Prompt: writePrompt,
    },
  }
}

export async function runReasoningBenchmark() {
  console.log('🚀 Running Experiment: Reasoning Schemes (Zero-Shot vs CoT)')

  const testResult = await runABTest(
    'Reasoning Benchmark',
    { name: 'Zero-Shot', generate: generateZeroShot },
    { name: 'Chain-of-Thought', generate: generateCoT },
    { evaluatorSet: 'pro', sampleSize: 3, parallelism: 1 }
  )

  saveABTestReport(testResult)

  // Save for Dashboard
  const dashboardReport: MultiVariantReport = {
    id: testResult.variantA.id,
    timestamp: new Date().toISOString(),
    scenarios: ['General'],
    variants: [mapToVariantReport(testResult.variantA), mapToVariantReport(testResult.variantB)],
  }

  const resultsDir = path.resolve(process.cwd(), 'src/evaluation/results')
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true })
  fs.writeFileSync(path.join(resultsDir, 'latest.json'), JSON.stringify(dashboardReport, null, 2))
  console.log('   💾 Dashboard data saved: src/evaluation/results/latest.json')
}

if (require.main === module) {
  runReasoningBenchmark().catch(console.error)
}
