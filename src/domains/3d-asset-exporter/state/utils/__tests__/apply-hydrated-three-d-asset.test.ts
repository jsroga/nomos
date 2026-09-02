import { describe, expect, it } from 'vitest'
import { GenerationStatus } from '../../../contracts'
import {
  resolveHydratedGenerationRun,
  shouldResumeGeneration,
} from '../apply-hydrated-three-d-asset'

describe('shouldResumeGeneration', () => {
  it('returns the trigger run id while generation is processing', () => {
    expect(
      shouldResumeGeneration({
        triggerRunId: 'run-1',
        generationStatus: GenerationStatus.Processing,
      }),
    ).toBe('run-1')
  })

  it('returns null when generation is not processing', () => {
    expect(
      shouldResumeGeneration({
        triggerRunId: 'run-1',
        generationStatus: GenerationStatus.Completed,
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
