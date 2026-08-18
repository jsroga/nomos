import { describe, expect, it } from 'vitest'
import { Phase } from '@/domains/storyteller/core/types/enums'
import {
  resolveStorytellerPhaseClick,
  storytellerAdvanceablePhase,
  StorytellerPhaseClick,
} from '../resolve-storyteller-phase-click'

describe('storytellerAdvanceablePhase', () => {
  it('unlocks Draft once beats exist on the Beats phase', () => {
    expect(
      storytellerAdvanceablePhase({ currentPhase: Phase.BREAKING, beatCount: 3 }),
    ).toBe(Phase.WRITING)
  })

  it('keeps Draft locked while the board is empty', () => {
    expect(
      storytellerAdvanceablePhase({ currentPhase: Phase.BREAKING, beatCount: 0 }),
    ).toBeUndefined()
  })
})

describe('resolveStorytellerPhaseClick', () => {
  it('advances Beats → Draft when beats are on the board', () => {
    expect(
      resolveStorytellerPhaseClick({
        currentPhase: Phase.BREAKING,
        targetPhase: Phase.WRITING,
        beatCount: 8,
      }),
    ).toBe(StorytellerPhaseClick.Advance)
  })

  it('ignores Draft while no beats exist', () => {
    expect(
      resolveStorytellerPhaseClick({
        currentPhase: Phase.BREAKING,
        targetPhase: Phase.WRITING,
        beatCount: 0,
      }),
    ).toBe(StorytellerPhaseClick.Ignore)
  })

  it('switches view among already unlocked phases', () => {
    expect(
      resolveStorytellerPhaseClick({
        currentPhase: Phase.WRITING,
        targetPhase: Phase.BREAKING,
        beatCount: 8,
      }),
    ).toBe(StorytellerPhaseClick.View)
  })
})
