import { describe, expect, it } from 'vitest'
import { workflowStepStartId } from '../fix-inconsistencies-workflow-events'
import {
  FixInconsistenciesStepId,
  FixInconsistenciesWorkflowChunk,
} from '@/domains/storyteller/ai/workflows/constants/fix-inconsistencies-workflow'

describe('workflowStepStartId', () => {
  it('reads payload.id from a workflow-step-start chunk', () => {
    expect(
      workflowStepStartId({
        type: FixInconsistenciesWorkflowChunk.StepStart,
        id: FixInconsistenciesStepId.AssembleCanon,
        payload: { id: FixInconsistenciesStepId.AgenticScan },
      })
    ).toBe(FixInconsistenciesStepId.AgenticScan)
  })

  it('falls back to event.id when payload.id is missing', () => {
    expect(
      workflowStepStartId({
        type: FixInconsistenciesWorkflowChunk.StepStart,
        id: FixInconsistenciesStepId.AssembleCanon,
        payload: {},
      })
    ).toBe(FixInconsistenciesStepId.AssembleCanon)
  })

  it('ignores other chunk types', () => {
    expect(
      workflowStepStartId({
        payload: { id: FixInconsistenciesStepId.AssembleCanon },
      })
    ).toBeUndefined()
  })
})
