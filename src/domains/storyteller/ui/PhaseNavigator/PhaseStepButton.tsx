import React from 'react'
import { Check, Lock, Loader2 } from 'lucide-react'
import { cn } from '@/shared/data/utils'
import {
  PhaseNavigatorCompactButtonClass,
  PhaseNavigatorFullButtonClass,
  PhaseNavigatorState,
} from '@/domains/storyteller/ui/PhaseNavigator/constants/phase-navigator'

export const PHASE_COMPLETE_CHECK_CLASS = 'text-[#4ade80]'

interface PhaseConfig {
  id: string
  label: string
  shortLabel: string
  icon: React.ReactNode
  color: string
  activeColor: string
  completedColor: string
  description: string
}

interface PhaseStepIconProps {
  state: `${PhaseNavigatorState}`
  phase: PhaseConfig
  isWorking: boolean
}

export const PhaseStepIcon: React.FC<PhaseStepIconProps> = ({ state, phase, isWorking }) => {
  if (state === PhaseNavigatorState.Completed) {
    return <Check size={12} strokeWidth={2.6} className={PHASE_COMPLETE_CHECK_CLASS} />
  }
  if (state === PhaseNavigatorState.Locked) {
    return <Lock size={12} strokeWidth={1.8} />
  }
  if (isWorking && state === PhaseNavigatorState.Active) {
    return <Loader2 size={12} className="animate-spin" />
  }
  return <>{phase.icon}</>
}

interface PhaseFullStepIconProps {
  state: `${PhaseNavigatorState}`
  phase: PhaseConfig
  isWorking: boolean
}

export const PhaseFullStepIcon: React.FC<PhaseFullStepIconProps> = ({ state, phase, isWorking }) => {
  if (state === PhaseNavigatorState.Completed) {
    return <Check size={14} strokeWidth={2.6} className={PHASE_COMPLETE_CHECK_CLASS} />
  }
  if (state === PhaseNavigatorState.Locked) {
    return <Lock size={12} />
  }
  if (isWorking && state === PhaseNavigatorState.Active) {
    return <Loader2 size={14} className="animate-spin" />
  }
  return <>{phase.icon}</>
}

export const getCompactPhaseButtonClass = (
  _phase: PhaseConfig,
  state: `${PhaseNavigatorState}`,
  canNav: boolean
): string =>
  cn(
    PhaseNavigatorCompactButtonClass.Base,
    state === PhaseNavigatorState.Active && PhaseNavigatorCompactButtonClass.Current,
    state === PhaseNavigatorState.Ready && PhaseNavigatorCompactButtonClass.Ready,
    state === PhaseNavigatorState.Locked
      ? PhaseNavigatorCompactButtonClass.Locked
      : PhaseNavigatorCompactButtonClass.Reachable,
    canNav ? PhaseNavigatorFullButtonClass.CompletedPointer : PhaseNavigatorCompactButtonClass.IdleCursor
  )

export const getFullPhaseButtonClass = (
  phase: PhaseConfig,
  state: `${PhaseNavigatorState}`
): string =>
  cn(
    PhaseNavigatorFullButtonClass.Base,
    PhaseNavigatorFullButtonClass.Border,
    state === PhaseNavigatorState.Active && [
      phase.activeColor,
      'shadow-lg shadow-current/20',
      PhaseNavigatorFullButtonClass.ActiveScale,
    ],
    state === PhaseNavigatorState.Completed && [
      'bg-zinc-800/60 border-zinc-700/80 text-zinc-300',
      'hover:bg-zinc-700/60 hover:border-zinc-600',
      PhaseNavigatorFullButtonClass.CompletedPointer,
    ],
    state === PhaseNavigatorState.Unlocked && [
      'bg-zinc-800/40 border-zinc-700/60 text-zinc-400',
      'hover:bg-zinc-700/60 hover:border-zinc-600',
      PhaseNavigatorFullButtonClass.CompletedPointer,
    ],
    state === PhaseNavigatorState.Ready && [
      phase.activeColor,
      PhaseNavigatorFullButtonClass.CompletedPointer,
    ],
    state === PhaseNavigatorState.Locked && [
      'bg-zinc-900/30 border-zinc-800/50 text-zinc-600',
      PhaseNavigatorFullButtonClass.Locked,
    ]
  )
