import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  LIVE_QUALITY_DATASET_NAME,
  LIVE_QUALITY_VERSION,
  STORYTELLER_LIVE_QUALITY_EXAMPLES,
} from '../datasets/storyteller-live-quality'
import { STORYTELLER_GOLDEN_EXAMPLES } from '../datasets/storyteller-golden'
import { isPlainObject } from '@/shared/data/json-guards'
import {
  HourLoopTarget,
  QualityImproverGoalPrompt,
  QUALITY_IMPROVER_INSTRUCTIONS,
} from '@/shared/agent-kernel/mastra/quality-improver/constants'

const LIVE_PUBLISH = join(process.cwd(), 'evals/tools/publish-live-quality-studio.ts')
const GOLDEN_PUBLISH = join(process.cwd(), 'evals/tools/publish-golden-quality-studio.ts')
const HOUR_TOOLS = join(
  process.cwd(),
  'src/shared/agent-kernel/mastra/quality-improver/tools.ts',
)
const HOUR_AGENT = join(
  process.cwd(),
  'src/shared/agent-kernel/mastra/quality-improver/agent.ts',
)
const CHAMPION = join(process.cwd(), 'evals/results/champion.json')

describe('storyteller live quality dataset', () => {
  it('pins versioned inputs only, 12–16 briefs, no referenceOutput', () => {
    expect(LIVE_QUALITY_DATASET_NAME).toBe('storyteller-live-quality')
    expect(STORYTELLER_LIVE_QUALITY_EXAMPLES.length).toBeGreaterThanOrEqual(12)
    expect(STORYTELLER_LIVE_QUALITY_EXAMPLES.length).toBeLessThanOrEqual(16)
    for (const example of STORYTELLER_LIVE_QUALITY_EXAMPLES) {
      expect(example.version).toBe(LIVE_QUALITY_VERSION)
      expect(example.input.message.length).toBeGreaterThan(0)
      expect(example).not.toHaveProperty('referenceOutput')
      expect(example.metadata.scorers.length).toBeGreaterThan(0)
    }
    expect(STORYTELLER_GOLDEN_EXAMPLES[0]).toHaveProperty('referenceOutput')
  })

  it('marks a minority of briefs underpowered for max(2σ, 0.02)', () => {
    const underpowered = STORYTELLER_LIVE_QUALITY_EXAMPLES.filter(
      example => example.metadata.underpowered,
    )
    expect(underpowered.length).toBeGreaterThan(0)
    expect(underpowered.length).toBeLessThan(STORYTELLER_LIVE_QUALITY_EXAMPLES.length / 2)
  })

  it('live publisher targets grrm-author generate; golden stays fixture task()', () => {
    const live = readFileSync(LIVE_PUBLISH, 'utf8')
    const golden = readFileSync(GOLDEN_PUBLISH, 'utf8')
    expect(live).toContain(HourLoopTarget.GrrmAuthor)
    expect(live).toContain('targetType: HourLoopTarget.AgentType')
    expect(live).toContain('targetId: HourLoopTarget.GrrmAuthor')
    expect(golden).toContain('task:')
    expect(golden).toContain('goldenQualityTaskOutput')
    expect(golden).not.toContain(HourLoopTarget.GrrmAuthor)
  })

  it('pins string scorer ids on Studio experiment rows so Evaluation lists every column', () => {
    const live = readFileSync(LIVE_PUBLISH, 'utf8')
    const golden = readFileSync(GOLDEN_PUBLISH, 'utf8')
    const aeternum = readFileSync(
      join(process.cwd(), 'evals/tools/publish-aeternum-studio.ts'),
      'utf8',
    )
    const pin = readFileSync(
      join(process.cwd(), 'evals/tools/pin-experiment-scorer-ids.ts'),
      'utf8',
    )
    expect(pin).toContain('UPDATE mastra_experiments SET "scorerIds"')
    expect(live).toContain('scorers: [...LIVE_QUALITY_DEFAULT_SCORERS]')
    expect(live).toContain('pinExperimentScorerIds')
    expect(golden).toContain('scorerIds: GOLDEN_QUALITY_SCORER_IDS')
    expect(golden).toContain('pinExperimentScorerIds')
    expect(aeternum).toContain('scorers: scorerIds')
    expect(aeternum).toContain('pinExperimentScorerIds')
    expect(aeternum).toContain('STRUCTURAL_EXPERIMENT_SCORERS.map(scorer => scorer.id)')
  })

  it('hour-bot cannot PATCH the exam, Publish, or git commit', () => {
    const tools = readFileSync(HOUR_TOOLS, 'utf8')
    const agent = readFileSync(HOUR_AGENT, 'utf8')
    expect(tools).not.toMatch(/addItems\s*\(/)
    expect(tools).not.toMatch(/\.updateItems\s*\(/)
    expect(tools).not.toMatch(/git commit/)
    expect(tools).not.toMatch(/MastraAgentVersionStatus\.Published/)
    expect(QualityImproverGoalPrompt.Stop).toContain('Do not git commit')
    expect(QUALITY_IMPROVER_INSTRUCTIONS).toContain('Never Publish')
    expect(agent).toContain('QualityImproverGoalPrompt.Stop')
  })

  it('champion pointer is operator-owned JSON', () => {
    const parsed: unknown = JSON.parse(readFileSync(CHAMPION, 'utf8'))
    if (!isPlainObject(parsed)) {
      throw new Error('champion.json must be an object')
    }
    const dataset = parsed.dataset
    const experimentId = parsed.experimentId
    const note = parsed.note
    if (typeof dataset !== 'string' || typeof note !== 'string' || experimentId !== null) {
      throw new Error('champion.json shape is invalid')
    }
    expect(dataset).toBe(LIVE_QUALITY_DATASET_NAME)
    expect(experimentId).toBeNull()
    expect(note.toLowerCase()).toContain('hour-bot never')
    const tools = readFileSync(HOUR_TOOLS, 'utf8')
    expect(tools).not.toContain('champion.json')
  })
})
