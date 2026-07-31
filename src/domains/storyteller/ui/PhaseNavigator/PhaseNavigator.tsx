/**
 * PhaseNavigator - Unified Phase & View Navigation
 */

import React from 'react'
import { cn } from '@/shared/data/utils'
import { Sparkles, LayoutGrid, PenTool, ChevronRight } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'
import type { PhaseId } from '@/domains/storyteller/core/types/enums'
import {
  PhaseNavigatorActiveStyle,
  PhaseNavigatorColor,
  PhaseNavigatorCompletedStyle,
  PhaseNavigatorDescription,
  PhaseNavigatorLabel,
  PhaseNavigatorPhase,
  PhaseNavigatorShortLabel,
  PhaseNavigatorState,
} from '@/domains/storyteller/ui/PhaseNavigator/constants/phase-navigator'
import {
  getCompactPhaseButtonClass,
  getFullPhaseButtonClass,
  PhaseFullStepIcon,
  PhaseStepIcon,
} from './PhaseStepButton'

interface PhaseConfig {
  id: PhaseId
  label: string
  shortLabel: string
  icon: React.ReactNode
  color: string
  activeColor: string
  completedColor: string
  description: string
}

const PHASES: PhaseConfig[] = [
  {
    id: PhaseNavigatorPhase.PREMISE,
    label: PhaseNavigatorLabel.Premise,
    shortLabel: PhaseNavigatorShortLabel.Premise,
    icon: <Sparkles size={14} />,
    color: PhaseNavigatorColor.Premise,
    activeColor: PhaseNavigatorActiveStyle.Premise,
    completedColor: PhaseNavigatorCompletedStyle.Premise,
    description: PhaseNavigatorDescription.Premise,
  },
  {
    id: PhaseNavigatorPhase.BREAKING,
    label: PhaseNavigatorLabel.Break,
    shortLabel: PhaseNavigatorShortLabel.Break,
    icon: <LayoutGrid size={14} />,
    color: PhaseNavigatorColor.Break,
    activeColor: PhaseNavigatorActiveStyle.Break,
    completedColor: PhaseNavigatorCompletedStyle.Break,
    description: PhaseNavigatorDescription.Break,
  },
  {
    id: PhaseNavigatorPhase.WRITING,
    label: PhaseNavigatorLabel.Write,
    shortLabel: PhaseNavigatorShortLabel.Write,
    icon: <PenTool size={14} />,
    color: PhaseNavigatorColor.Write,
    activeColor: PhaseNavigatorActiveStyle.Write,
    completedColor: PhaseNavigatorCompletedStyle.Write,
    description: PhaseNavigatorDescription.Write,
  },
]

interface PhaseNavigatorProps {
  currentPhase: PhaseId
  /** Furthest unlocked phase (progress). Defaults to currentPhase. */
  progressPhase?: PhaseId
  completedPhases?: PhaseId[]
  isWorking?: boolean
  onPhaseChange?: (phase: PhaseId) => void
  onGoBack?: () => void
  compact?: boolean
  episodeTitle?: string
}

const getPhaseState = (
  phase: PhaseConfig,
  index: number,
  viewPhase: PhaseId,
  progressIndex: number
): `${PhaseNavigatorState}` => {
  if (phase.id === viewPhase) return PhaseNavigatorState.Active
  if (index <= progressIndex) return PhaseNavigatorState.Completed
  return PhaseNavigatorState.Locked
}

const canNavigateTo = (
  state: `${PhaseNavigatorState}`,
  isWorking: boolean
): boolean => {
  if (isWorking) return false
  return state === PhaseNavigatorState.Completed || state === PhaseNavigatorState.Active
}

const CompactPhaseNavigator: React.FC<PhaseNavigatorProps> = ({
  currentPhase,
  progressPhase,
  isWorking = false,
  onPhaseChange,
}) => {
  const progressIndex = PHASES.findIndex(p => p.id === (progressPhase ?? currentPhase))

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 bg-zinc-900/80 backdrop-blur-sm rounded-md p-0.5 border border-zinc-800">
        {PHASES.map((phase, index) => {
          const state = getPhaseState(phase, index, currentPhase, progressIndex)
          const canNav = canNavigateTo(state, isWorking)

          return (
            <Tooltip key={phase.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => canNav && onPhaseChange?.(phase.id)}
                  disabled={!canNav}
                  className={getCompactPhaseButtonClass(phase, state, canNav)}
                >
                  <PhaseStepIcon state={state} phase={phase} isWorking={isWorking} />
                  <span>{phase.shortLabel}</span>
                  {state === PhaseNavigatorState.Active && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-current animate-pulse" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p className="font-medium">{phase.label}</p>
                <p className="text-xs text-zinc-300">{phase.description}</p>
                {state === PhaseNavigatorState.Locked && (
                  <p className="text-xs text-amber-300 mt-1">Complete previous phases first</p>
                )}
                {state === PhaseNavigatorState.Completed && (
                  <p className="text-xs text-green-300 mt-1">Click to view</p>
                )}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

const FullPhaseNavigator: React.FC<PhaseNavigatorProps> = ({
  currentPhase,
  progressPhase,
  isWorking = false,
  onPhaseChange,
  episodeTitle,
}) => {
  const progressIndex = PHASES.findIndex(p => p.id === (progressPhase ?? currentPhase))

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        {episodeTitle && (
          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{episodeTitle}</div>
        )}

        <div className="flex items-center gap-0">
          {PHASES.map((phase, index) => {
            const state = getPhaseState(phase, index, currentPhase, progressIndex)
            const canNav = canNavigateTo(state, isWorking)
            const isLast = index === PHASES.length - 1

            return (
              <React.Fragment key={phase.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => canNav && onPhaseChange?.(phase.id)}
                      disabled={!canNav}
                      className={getFullPhaseButtonClass(phase, state)}
                    >
                      <span
                        className={cn(
                          'flex items-center justify-center w-6 h-6 rounded-full',
                          state === PhaseNavigatorState.Active && 'bg-current/20',
                          state === PhaseNavigatorState.Completed && 'bg-green-500/20',
                          state === PhaseNavigatorState.Locked && 'bg-zinc-800/50'
                        )}
                      >
                        <PhaseFullStepIcon state={state} phase={phase} isWorking={isWorking} />
                      </span>
                      <span className="hidden sm:inline">{phase.label}</span>
                      <span className="sm:hidden">{phase.shortLabel}</span>
                      {isWorking && state === PhaseNavigatorState.Active && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-current" />
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="font-medium">{phase.label}</p>
                    <p className="text-xs text-zinc-300 max-w-[180px]">{phase.description}</p>
                    {state === PhaseNavigatorState.Locked && (
                      <p className="text-xs text-amber-300 mt-1">Complete previous phases first</p>
                    )}
                    {state === PhaseNavigatorState.Completed && (
                      <p className="text-xs text-green-300 mt-1">Click to view</p>
                    )}
                  </TooltipContent>
                </Tooltip>

                {!isLast && (
                  <div
                    className={cn(
                      'flex items-center px-1',
                      index < progressIndex ? 'text-green-500/60' : 'text-zinc-700'
                    )}
                  >
                    <ChevronRight size={16} />
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>

        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500 rounded-full',
              (progressPhase ?? currentPhase) === PhaseNavigatorPhase.PREMISE && 'bg-purple-500 w-[33%]',
              (progressPhase ?? currentPhase) === PhaseNavigatorPhase.BREAKING && 'bg-blue-500 w-[66%]',
              (progressPhase ?? currentPhase) === PhaseNavigatorPhase.WRITING && 'bg-emerald-500 w-full',
              (progressPhase ?? currentPhase) === PhaseNavigatorPhase.COMPLETE && 'bg-green-500 w-full'
            )}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}

export const PhaseNavigator: React.FC<PhaseNavigatorProps> = props =>
  props.compact ? <CompactPhaseNavigator {...props} /> : <FullPhaseNavigator {...props} />

export const PhaseNavigatorCompact: React.FC<Omit<PhaseNavigatorProps, 'compact'>> = props => (
  <PhaseNavigator {...props} compact />
)
