import * as fs from 'fs'
import * as path from 'path'

// Load environment from .env.local BEFORE other imports
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
}

import { registerCorePrompts } from '../../prompts/registry'
import { StorytellerAgent } from '@/domains/storyteller/agents/StorytellerAgent'
import { PersonaFidelityJudge } from '../judges/creative/persona-judge'
import { MagicJudge } from '../judges/creative/magic-judge'
import { CoherenceJudge } from '../judges/coherence-judge'
import { BaseJudge } from '../judges/base-judge'
import type {
  CustomEvaluator,
  EvaluatorInput,
  EvaluatorResult,
  MultiVariantReport,
  VariantReport,
} from '../types'

// Adapter for judges
class JudgeAdapter implements CustomEvaluator {
  constructor(private judge: BaseJudge) {}
  get name() {
    return this.judge.name
  }
  async evaluate(params: EvaluatorInput): Promise<EvaluatorResult> {
    const result = await this.judge.evaluate(params.input, params.output, params.reference)
    return {
      score: result.score,
      reasoning: result.reason,
      metadata: { ...result.metadata, scoreName: result.scoreName },
    }
  }
}

const PERSONA_EXAMPLES = [
  {
    id: 'p-01',
    input: {
      message: 'Write a scene where a character returns home to find everything changed.',
      projectId: 'eval-persona',
    },
    scenario: 'Creative Writing',
  },
  {
    id: 'p-02',
    input: { message: 'A tense confrontation in a crowded diner.', projectId: 'eval-persona' },
    scenario: 'Creative Writing',
  },
  {
    id: 'p-03',
    input: { message: 'A monologue about a lost opportunity.', projectId: 'eval-persona' },
    scenario: 'Creative Writing',
  },
]

async function runPersonaExperiment() {
  registerCorePrompts()
  const agent = await StorytellerAgent.create('openai:gpt-4o', false)
  const evaluators = [
    new JudgeAdapter(new PersonaFidelityJudge()),
    new JudgeAdapter(new MagicJudge()),
    new JudgeAdapter(new CoherenceJudge()),
  ]

  const personas = [
    { name: 'George R.R. Martin', skill: 'george-rr-martin' },
    { name: 'Vince Gilligan', skill: 'vince-gilligan' },
    { name: 'David Lynch', skill: 'david-lynch' },
  ]

  const variants: VariantReport[] = []

  for (const persona of personas) {
    console.log(`🧪 Evaluating Persona: ${persona.name}...`)

    const exampleLogs = []
    let totalLatency = 0

    // Load skill content
    const skillPath = path.resolve(process.cwd(), `skills/${persona.skill}/SKILL.md`)
    const skillContent = fs.readFileSync(skillPath, 'utf-8').split('---')[2]

    for (const example of PERSONA_EXAMPLES) {
      const start = Date.now()

      // Generate output with skill context
      const output = await agent.run(
        example.input.message,
        `Project ID: ${example.input.projectId}\n\nACTIVE SKILL INSTRUCTIONS:\n${skillContent}`,
        undefined,
        'none'
      )

      const latency = Date.now() - start
      totalLatency += latency

      // Evaluate
      const evaluationResults = await Promise.all(
        evaluators.map(async evaluator => {
          const result = await evaluator.evaluate({
            input: { ...example.input, persona: persona.name } as any,
            output: output as any,
          })
          return { ...result, name: evaluator.name }
        })
      )

      const avgScore =
        evaluationResults.reduce((sum, r) => sum + r.score, 0) / evaluationResults.length

      exampleLogs.push({
        id: example.id,
        scenario: example.scenario,
        input: JSON.stringify(example.input),
        output,
        score: avgScore,
        reasoning: evaluationResults.map(r => `${r.name}: ${r.reasoning}`).join(' | '),
      })
    }

    variants.push({
      name: persona.name,
      config: { persona: persona.skill },
      overallMetrics: {
        magicScore: exampleLogs.reduce((sum, log) => sum + log.score, 0) / exampleLogs.length,
        consistency: 1.0,
        orchestration: 1.0,
        latencyMs: totalLatency / exampleLogs.length,
        costUsd: 0,
      },
      scenarioMetrics: {
        // Scenario metrics can be empty or have generic keys
      } as any,
      exampleLogs,
    })
  }

  const report: MultiVariantReport = {
    id: `persona_eval_${Date.now()}`,
    timestamp: new Date().toISOString(),
    scenarios: ['Creative Writing'],
    variants,
  }

  const { savePersonaReport } = await import('../report-generator')
  const reportPath = await savePersonaReport(report)

  // Also save as latest.json for consistency
  const resultsDir = path.resolve(process.cwd(), 'src/evaluation/results')
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true })
  fs.writeFileSync(path.join(resultsDir, 'latest.json'), JSON.stringify(report, null, 2))
}

runPersonaExperiment().catch(err => {
  console.error('❌ Persona Evaluation Failed:', err)
  process.exit(1)
})
