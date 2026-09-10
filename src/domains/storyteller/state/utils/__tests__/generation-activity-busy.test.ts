import { describe, expect, it } from 'vitest'
import {
  GenerationActivityPhase,
  isGenerationActivityBusy,
} from '../storyteller-ui-store'

describe('isGenerationActivityBusy', () => {
  it('treats submitted/streaming/tool as busy', () => {
    expect(isGenerationActivityBusy(GenerationActivityPhase.Submitted)).toBe(true)
    expect(isGenerationActivityBusy(GenerationActivityPhase.Streaming)).toBe(true)
    expect(isGenerationActivityBusy(GenerationActivityPhase.Tool)).toBe(true)
  })

  it('treats idle and error as not busy', () => {
    expect(isGenerationActivityBusy(GenerationActivityPhase.Idle)).toBe(false)
    expect(isGenerationActivityBusy(GenerationActivityPhase.Error)).toBe(false)
  })
})
