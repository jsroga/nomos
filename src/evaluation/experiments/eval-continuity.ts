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
      latencyMs: run.aggregatedScores['latencyMs'] || 0, // Now supported
      costUsd: run.aggregatedScores['costUsd'] || 0,
    },
    scenarioMetrics: {},
    exampleLogs: run.results.map((r: any) => ({
      id: r.exampleId,
      scenario: 'continuity',
      input: JSON.stringify(r.input),
      output: typeof r.output === 'string' ? r.output : JSON.stringify(r.output),
      score: r.scores['magic-score'] || 0,
      reasoning: r.reasoning,
      context: r.context,
    })),
  }
}

// Global "Database" to simulate persistent storage
const FACTS_DB = {
  fact_1: "Character 'Zoltar' has a red robotic eye.",
  fact_2: "The secret password is 'Blueberry'.",
}

// 1. Amnesiac (Baseline) - No history
async function generateAmnesiac(input: Record<string, unknown>): Promise<unknown> {
  // Simulating a fresh session every time
  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1024,
    temperature: 0.7,
    system: 'You are a storyteller.',
    messages: [{ role: 'user', content: JSON.stringify(input) }],
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''

  return {
    response: content,
    context: {
      strategy: 'Amnesiac (Baseline)',
      retrieved: 'None',
    },
  }
}

// 2. Memento (Mock RAG) - Perfect Recall
async function generateMemento(input: Record<string, unknown>): Promise<unknown> {
  // Simple verification check: Does input contain keywords?
  const inputStr = JSON.stringify(input).toLowerCase()
  let retrievedContext = ''

  if (inputStr.includes('zoltar')) retrievedContext += FACTS_DB['fact_1'] + '\n'
  if (inputStr.includes('password')) retrievedContext += FACTS_DB['fact_2'] + '\n'

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1024,
    temperature: 0.7,
    system: `You are a storyteller. KNOWN FACTS:\n${retrievedContext}`,
    messages: [{ role: 'user', content: JSON.stringify(input) }],
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''

  return {
    response: content,
    context: {
      strategy: 'Memento (RAG)',
      retrieved: retrievedContext || 'None detected',
    },
  }
}

export async function runContinuityBenchmark() {
  console.log('🚀 Running Experiment: Continuity (Amnesia vs Recall)')

  const examples = [
    {
      id: 'recall-1',
      input: { message: "Describe Zoltar's face." },
      expected: { contains: 'red robotic eye' },
      metadata: { scenario: 'continuity' },
    },
    {
      id: 'recall-2',
      input: { message: 'What is the secret password?' },
      expected: { contains: 'Blueberry' },
      metadata: { scenario: 'continuity' },
    },
    {
      id: 'recall-3',
      input: { message: 'Write a scene where Zoltar enters.' },
      expected: { contains: 'robotic eye' },
      metadata: { scenario: 'continuity' },
    },
  ]

  const testResult = await runABTest(
    'Continuity Benchmark',
    { name: 'Amnesiac (Baseline)', generate: generateAmnesiac },
    { name: 'Memento (RAG)', generate: generateMemento },
    {
      evaluatorSet: 'pro',
      examples: examples,
      sampleSize: 3,
      parallelism: 1,
    }
  )

  saveABTestReport(testResult)

  const dashboardReport: MultiVariantReport = {
    id: testResult.variantA.id,
    timestamp: new Date().toISOString(),
    scenarios: ['Continuity'],
    variants: [mapToVariantReport(testResult.variantA), mapToVariantReport(testResult.variantB)],
  }

  const resultsDir = path.resolve(process.cwd(), 'src/evaluation/results')
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true })
  fs.writeFileSync(path.join(resultsDir, 'latest.json'), JSON.stringify(dashboardReport, null, 2))
  console.log('   💾 Dashboard data saved: src/evaluation/results/latest.json')
}

if (require.main === module) {
  runContinuityBenchmark().catch(console.error)
}
