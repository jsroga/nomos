import { describe, expect, it } from 'vitest'
import {
  encodeFixInconsistenciesSse,
  parseFixInconsistenciesSseBlock,
  splitFixInconsistenciesSseChunks,
} from '../fix-inconsistencies-sse'
import { FixInconsistenciesSseEvent } from '@/domains/storyteller/ai/workflows/constants/fix-inconsistencies-workflow'
import { fixInconsistenciesResumeSchema } from '@/domains/storyteller/ai/workflows/fix-inconsistencies-contract'
import { FixInconsistenciesVerdictAction } from '@/domains/storyteller/ai/workflows/constants/fix-inconsistencies-workflow'
import { MastraWorkflowStatus } from '@/shared/data/constants/protocol'

describe('fix-inconsistencies SSE', () => {
  it('round-trips a suspended event', () => {
    const encoded = encodeFixInconsistenciesSse(FixInconsistenciesSseEvent.Suspended, {
      runId: 'run-1',
      empty: false,
    })
    const parsed = parseFixInconsistenciesSseBlock(encoded.trim())
    expect(parsed?.event).toBe(FixInconsistenciesSseEvent.Suspended)
    expect(parsed?.data.runId).toBe('run-1')
  })

  it('splits a buffered stream into frames', () => {
    const first = encodeFixInconsistenciesSse(FixInconsistenciesSseEvent.Started, { runId: 'r' })
    const second = encodeFixInconsistenciesSse(FixInconsistenciesSseEvent.Step, { stepId: 'assemble-canon' })
    const { frames, rest } = splitFixInconsistenciesSseChunks(`${first}${second}event: `)
    expect(frames).toHaveLength(2)
    expect(rest.startsWith('event:')).toBe(true)
  })
})

describe('fix-inconsistencies resume contract', () => {
  it('rejects unknown actions', () => {
    const parsed = fixInconsistenciesResumeSchema.safeParse({
      runId: 'run-1',
      action: 'approve',
      projectId: 'p1',
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts apply and discard', () => {
    expect(
      fixInconsistenciesResumeSchema.parse({
        runId: 'run-1',
        action: FixInconsistenciesVerdictAction.Apply,
        projectId: 'p1',
      }).action
    ).toBe(FixInconsistenciesVerdictAction.Apply)
  })

  it('treats non-suspended runs as unrestorable', () => {
    expect(MastraWorkflowStatus.Failed).not.toBe(MastraWorkflowStatus.Suspended)
  })
})
