import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadAgentInstructions } from '@/shared/agent-kernel/mastra/load-agent-instructions'
import { assembleFsAgent } from '@/shared/agent-kernel/mastra/load-fs-agent'
import { CriticAgentId } from '@/domains/storyteller/ai/agents/critics/constants/critic-agents'
import dialogueConfig from '../../../../../../mastra/agents/dialogue-critic/config'
import { formatCriticReport } from '../critic-schema'
import {
  DIALOGUE_PROBLEM_TYPES,
  findingQuoteRequired,
  isDialogueProblemType,
} from '../dialogue-problem'
import {
  FindingSeverity,
  FindingSchema,
  ProblemType,
  type Finding,
} from '@/domains/storyteller/core/types/finding'
import { BeatDraftCriticName } from '@/domains/storyteller/ai/workflows/constants/beat-draft-workflow'

describe('file-based dialogue critic', () => {
  it('loads the dialogue brief from instructions.md', () => {
    const md = loadAgentInstructions(CriticAgentId.Dialogue)
    expect(md).toContain('dialogue_adjacency')
    expect(md).toContain('dialogue_embodiment')
    expect(md).toContain('Diagnosis only')
  })

  it('assembles the dialogue critic from the FS package', () => {
    expect(assembleFsAgent(CriticAgentId.Dialogue, dialogueConfig).id).toBe(
      CriticAgentId.Dialogue
    )
  })

  it('does not add a cognition critic package (Wave 1 no-go)', () => {
    const dir = join(process.cwd(), 'src/mastra/agents/cognition-critic')
    expect(existsSync(dir)).toBe(false)
  })
})

describe('dialogue finding format', () => {
  const finding: Finding = {
    location: { beatId: 'draft', paragraph: 2, quote: 'VERA\nI know what you did.' },
    problemType: ProblemType.DialogueAdjacency,
    whatHappensNow: 'Two cues fire with no body between them.',
    whyItFails: 'Adjacent talking-heads.',
    revisionDirection: 'Put an action or interruption between the cues.',
    severity: FindingSeverity.Error,
    promoteToProjectRule: false,
  }

  it('requires a location quote and maps dialogue problem types', () => {
    expect(FindingSchema.parse(finding).location.quote.length).toBeGreaterThan(0)
    expect(findingQuoteRequired(finding)).toBe(finding.location.quote)
    expect(isDialogueProblemType(ProblemType.DialogueAdjacency)).toBe(true)
    expect(isDialogueProblemType(ProblemType.DialogueEmbodiment)).toBe(true)
    expect(isDialogueProblemType(ProblemType.ViewpointOverreach)).toBe(false)
    expect(DIALOGUE_PROBLEM_TYPES).toHaveLength(2)
  })

  it('formats a dialogue report with the quoted line', () => {
    const report = formatCriticReport(BeatDraftCriticName.Dialogue, { findings: [finding] })
    expect(report).toContain(finding.location.quote)
    expect(report).toContain(FindingSeverity.Error)
  })
})
