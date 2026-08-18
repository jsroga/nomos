import type { PhaseId } from '@/domains/storyteller/core/types/enums'
import { STORYTELLER_PHASE_ORDER } from '@/domains/storyteller/state/utils/resolve-storyteller-phase-click'
import { PhaseNavigatorState } from '@/domains/storyteller/ui/PhaseNavigator/constants/phase-navigator'

export function phaseNavigatorProgressIndex(progressPhase: PhaseId): number {
  return STORYTELLER_PHASE_ORDER.indexOf(progressPhase)
}

export function getPhaseNavigatorState(input: {
  phaseId: PhaseId
  index: number
  viewPhase: PhaseId
  progressIndex: number
  advanceablePhase?: PhaseId
}): PhaseNavigatorState {
  if (input.phaseId === input.viewPhase) return PhaseNavigatorState.Active
  if (input.index < input.progressIndex) return PhaseNavigatorState.Completed
  if (input.index <= input.progressIndex) return PhaseNavigatorState.Unlocked
  if (input.advanceablePhase && input.phaseId === input.advanceablePhase) {
    return PhaseNavigatorState.Ready
  }
  return PhaseNavigatorState.Locked
}

export function canNavigatePhase(
  state: PhaseNavigatorState,
  isWorking: boolean,
): boolean {
  if (isWorking) return false
  return state !== PhaseNavigatorState.Locked
}
