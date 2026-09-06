import { describe, expect, it } from 'vitest'
import {
  stPatchPlanSequenceRequest,
  stSavePlanRequest,
} from '@/domains/storyteller/core/io/openapi-schemas'
import {
  planPatchSequenceRequestSchema,
  planSaveRequestSchema,
} from '@/domains/storyteller/core/io/plan-patch'

describe('plan save and sequence PATCH schemas', () => {
  it('wires OpenAPI bodies to the executed schemas', () => {
    expect(stSavePlanRequest).toBe(stSavePlanRequest)
    expect(stPatchPlanSequenceRequest).toBe(stPatchPlanSequenceRequest)
    expect(planSaveRequestSchema.safeParse({ episodeId: 'e1' }).success).toBe(true)
  })

  it('requires sequenceId and updates on sequence PATCH', () => {
    expect(
      planPatchSequenceRequestSchema.safeParse({ episodeId: 'e1', sequenceId: 's1' }).success
    ).toBe(false)
    expect(
      planPatchSequenceRequestSchema.safeParse({
        episodeId: 'e1',
        sequenceId: 's1',
        updates: { title: 'Dock' },
      }).success
    ).toBe(true)
  })
})
