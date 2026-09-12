import { describe, expect, it } from 'vitest'
import {
  encodeFixInconsistenciesSse,
  encodeFixInconsistenciesSseComment,
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

  it('skips comment heartbeats', () => {
    const comment = encodeFixInconsistenciesSseComment()
    const event = encodeFixInconsistenciesSse(FixInconsistenciesSseEvent.Started, { runId: 'r' })
    const { frames } = splitFixInconsistenciesSseChunks(`${comment}${event}`)
    expect(frames).toHaveLength(1)
    expect(frames[0]?.event).toBe(FixInconsistenciesSseEvent.Started)
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
