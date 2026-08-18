import { Phase, type PhaseId } from '@/domains/storyteller/core/types/enums'

export const STORYTELLER_PHASE_ORDER: PhaseId[] = [
  Phase.PREMISE,
  Phase.BREAKING,
  Phase.WRITING,
  Phase.COMPLETE,
]

export enum StorytellerPhaseClick {
  View = 'view',
  Advance = 'advance',
  Ignore = 'ignore',
}

export function storytellerAdvanceablePhase(input: {
  currentPhase: PhaseId
  beatCount: number
}): PhaseId | undefined {
  if (input.currentPhase === Phase.BREAKING && input.beatCount > 0) return Phase.WRITING
  return undefined
}

export function resolveStorytellerPhaseClick(input: {
  currentPhase: PhaseId
  targetPhase: PhaseId
  beatCount: number
}): StorytellerPhaseClick {
  const progressIdx = STORYTELLER_PHASE_ORDER.indexOf(input.currentPhase)
  const targetIdx = STORYTELLER_PHASE_ORDER.indexOf(input.targetPhase)
  if (targetIdx < 0 || progressIdx < 0) return StorytellerPhaseClick.Ignore
  if (targetIdx <= progressIdx) return StorytellerPhaseClick.View
  if (
    targetIdx === progressIdx + 1 &&
    storytellerAdvanceablePhase({
      currentPhase: input.currentPhase,
      beatCount: input.beatCount,
    }) === input.targetPhase
  ) {
    return StorytellerPhaseClick.Advance
  }
  return StorytellerPhaseClick.Ignore
}
