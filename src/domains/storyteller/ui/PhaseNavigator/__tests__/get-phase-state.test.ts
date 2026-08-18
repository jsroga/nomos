import { describe, expect, it } from 'vitest'
import { Phase } from '@/domains/storyteller/core/types/enums'
import { PhaseNavigatorState } from '@/domains/storyteller/ui/PhaseNavigator/constants/phase-navigator'
import {
  getPhaseNavigatorState,
  phaseNavigatorProgressIndex,
} from '../get-phase-state'

const PREMISE = 0
const BEATS = 1
const DRAFT = 2
const PHASE_AT_INDEX = [Phase.PREMISE, Phase.BREAKING, Phase.WRITING] as const

function state(input: {
  phaseIndex: number
  view: (typeof PHASE_AT_INDEX)[number]
  progress: (typeof PHASE_AT_INDEX)[number] | typeof Phase.COMPLETE
  advanceable?: typeof Phase.WRITING
}): PhaseNavigatorState {
  return getPhaseNavigatorState({
    phaseId: PHASE_AT_INDEX[input.phaseIndex] ?? Phase.WRITING,
    index: input.phaseIndex,
    viewPhase: input.view,
    progressIndex: phaseNavigatorProgressIndex(input.progress),
    advanceablePhase: input.advanceable,
  })
}

describe('getPhaseNavigatorState', () => {
  it('keeps Draft as unlocked when viewing Beats after opening Draft', () => {
    expect(state({ phaseIndex: PREMISE, view: Phase.BREAKING, progress: Phase.WRITING })).toBe(
      PhaseNavigatorState.Completed,
    )
    expect(state({ phaseIndex: BEATS, view: Phase.BREAKING, progress: Phase.WRITING })).toBe(
      PhaseNavigatorState.Active,
    )
    expect(state({ phaseIndex: DRAFT, view: Phase.BREAKING, progress: Phase.WRITING })).toBe(
      PhaseNavigatorState.Unlocked,
    )
  })

  it('keeps Beats as unlocked when viewing Premise before Beats are finished', () => {
    expect(state({ phaseIndex: PREMISE, view: Phase.PREMISE, progress: Phase.BREAKING })).toBe(
      PhaseNavigatorState.Active,
    )
    expect(state({ phaseIndex: BEATS, view: Phase.PREMISE, progress: Phase.BREAKING })).toBe(
      PhaseNavigatorState.Unlocked,
    )
    expect(state({ phaseIndex: DRAFT, view: Phase.PREMISE, progress: Phase.BREAKING })).toBe(
      PhaseNavigatorState.Locked,
    )
  })

  it('marks a phase completed only after progress has moved past it', () => {
    expect(state({ phaseIndex: PREMISE, view: Phase.WRITING, progress: Phase.WRITING })).toBe(
      PhaseNavigatorState.Completed,
    )
    expect(state({ phaseIndex: BEATS, view: Phase.WRITING, progress: Phase.WRITING })).toBe(
      PhaseNavigatorState.Completed,
    )
    expect(state({ phaseIndex: DRAFT, view: Phase.WRITING, progress: Phase.WRITING })).toBe(
      PhaseNavigatorState.Active,
    )
  })

  it('treats Draft as ready when Beats can advance', () => {
    expect(
      state({
        phaseIndex: DRAFT,
        view: Phase.BREAKING,
        progress: Phase.BREAKING,
        advanceable: Phase.WRITING,
      }),
    ).toBe(PhaseNavigatorState.Ready)
  })
})
