import { describe, expect, it } from 'vitest'
import { GenerationStatus } from '../../../core/types/three-d-generation'
import {
  resolveHydratedGenerationRun,
  shouldResumeGeneration,
} from '../apply-hydrated-three-d-asset'

describe('shouldResumeGeneration', () => {
  it('returns the trigger run id while generation is processing', () => {
    expect(
      shouldResumeGeneration({
        trigger_run_id: 'run-1',
        generation_status: GenerationStatus.Processing,
      }),
    ).toBe('run-1')
  })

  it('returns null when generation is not processing', () => {
    expect(
      shouldResumeGeneration({
        trigger_run_id: 'run-1',
        generation_status: GenerationStatus.Completed,
      }),
    ).toBeNull()
  })
})

describe('resolveHydratedGenerationRun', () => {
  it('keeps the spinner when hydrate says resume', () => {
    expect(resolveHydratedGenerationRun('run-1', true)).toEqual({
      runId: 'run-1',
      isGenerating: true,
    })
  })

  it('clears the spinner when processing ended without a resume id', () => {
    expect(resolveHydratedGenerationRun(undefined, true)).toEqual({
      runId: null,
      isGenerating: false,
    })
  })

  it('does not touch generation state when nothing was processing', () => {
    expect(resolveHydratedGenerationRun(undefined, false)).toBeNull()
  })
})
