/**
 * PhaseNavigator - Unified Phase & View Navigation
 *
 * Design Philosophy (Software as Fashion):
 * - ONE control, not two
 * - Progress feels like achievement
 * - Locked states are visually obvious
 * - No explanation needed - it's self-evident
 *
 * The journey: PREMISE → BREAK → WRITE
 * Each phase unlocks specific capabilities.
 */

import React from 'react'
import { cn } from '@/shared/data/utils'
import { Sparkles, LayoutGrid, PenTool, Check, Lock, ChevronRight, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'
import type { PhaseId } from '@/domains/storyteller/core/types/Enums'
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

// Canonical Phase type: PhaseId (string union from Enums.ts)

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
  /** Phases that are completed (can go back to) */
  completedPhases?: PhaseId[]
  /** Is AI currently working? Disables navigation */
  isWorking?: boolean
  /** Callback when user wants to go to a phase */
  onPhaseChange?: (phase: PhaseId) => void
  /** Callback when user wants to go back */
  onGoBack?: () => void
  /** Show compact version */
  compact?: boolean
  /** Episode title for context */
  episodeTitle?: string
}

export const PhaseNavigator: React.FC<PhaseNavigatorProps> = ({
  currentPhase,
  completedPhases = [],
  isWorking = false,
  onPhaseChange,
  onGoBack: _onGoBack,
  compact = false,
  episodeTitle,
}) => {
  const currentIndex = PHASES.findIndex(p => p.id === currentPhase)

  const getPhaseState = (
    phase: PhaseConfig,
    index: number
  ): `${PhaseNavigatorState}` => {
    if (completedPhases.includes(phase.id)) return PhaseNavigatorState.Completed
    if (phase.id === currentPhase) return PhaseNavigatorState.Active
    if (index < currentIndex) return PhaseNavigatorState.Completed
    return PhaseNavigatorState.Locked
  }

  const canNavigateTo = (phase: PhaseConfig, index: number): boolean => {
    if (isWorking) return false
    const state = getPhaseState(phase, index)
    return state === PhaseNavigatorState.Completed || state === PhaseNavigatorState.Active
  }

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1 bg-zinc-900/80 backdrop-blur-sm rounded-md p-0.5 border border-zinc-800">
          {PHASES.map((phase, index) => {
            const state = getPhaseState(phase, index)
            const canNav = canNavigateTo(phase, index)

            return (
              <Tooltip key={phase.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => canNav && onPhaseChange?.(phase.id)}
                    disabled={!canNav}
                    className={cn(
                      'relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200',
                      state === PhaseNavigatorState.Active && phase.activeColor,
                      state === PhaseNavigatorState.Completed && phase.completedColor,
                      state === PhaseNavigatorState.Locked &&
                        'text-zinc-600 cursor-not-allowed border border-transparent',
                      canNav && state !== PhaseNavigatorState.Active && 'hover:scale-105',
                      'border-2' // Match Web button border width
                    )}
                  >
                    {state === PhaseNavigatorState.Completed ? (
                      <Check size={12} className="text-green-400" />
                    ) : state === PhaseNavigatorState.Locked ? (
                      <Lock size={10} className="opacity-50" />
                    ) : isWorking && state === PhaseNavigatorState.Active ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      phase.icon
                    )}
                    <span>{phase.shortLabel}</span>

                    {/* Active indicator dot */}
                    {state === PhaseNavigatorState.Active && (
                      <span
                        className={cn(
                          'absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full',
                          'bg-current animate-pulse'
                        )}
                      />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="font-medium">{phase.label}</p>
                  <p className="text-xs text-muted-foreground">{phase.description}</p>
                  {state === PhaseNavigatorState.Locked && (
                    <p className="text-xs text-amber-400 mt-1">Complete previous phases first</p>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </TooltipProvider>
    )
  }

  // Full version with progress visualization
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        {/* Episode context */}
        {episodeTitle && (
          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{episodeTitle}</div>
        )}

        {/* Phase stepper */}
        <div className="flex items-center gap-0">
          {PHASES.map((phase, index) => {
            const state = getPhaseState(phase, index)
            const canNav = canNavigateTo(phase, index)
            const isLast = index === PHASES.length - 1

            return (
              <React.Fragment key={phase.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => canNav && onPhaseChange?.(phase.id)}
                      disabled={!canNav}
                      className={cn(
                        'relative flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-all duration-300',
                        'border-2 rounded-md',
                        // State-based styling
                        state === PhaseNavigatorState.Active && [
                          phase.activeColor,
                          'shadow-lg shadow-current/20',
                          'scale-105',
                        ],
                        state === PhaseNavigatorState.Completed && [
                          'bg-zinc-800/60 border-zinc-700/80 text-zinc-300',
                          'hover:bg-zinc-700/60 hover:border-zinc-600',
                          'cursor-pointer',
                        ],
                        state === PhaseNavigatorState.Locked && [
                          'bg-zinc-900/30 border-zinc-800/50 text-zinc-600',
                          'cursor-not-allowed opacity-60',
                        ]
                      )}
                    >
                      {/* Icon with state indicator */}
                      <span
                        className={cn(
                          'flex items-center justify-center w-6 h-6 rounded-full',
                          state === PhaseNavigatorState.Active && 'bg-current/20',
                          state === PhaseNavigatorState.Completed && 'bg-green-500/20',
                          state === PhaseNavigatorState.Locked && 'bg-zinc-800/50'
                        )}
                      >
                        {state === PhaseNavigatorState.Completed ? (
                          <Check size={14} className="text-green-400" />
                        ) : state === PhaseNavigatorState.Locked ? (
                          <Lock size={12} />
                        ) : isWorking && state === PhaseNavigatorState.Active ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          phase.icon
                        )}
                      </span>

                      {/* Label */}
                      <span className="hidden sm:inline">{phase.label}</span>
                      <span className="sm:hidden">{phase.shortLabel}</span>

                      {/* Working indicator */}
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
                    <p className="text-xs text-muted-foreground max-w-[180px]">
                      {phase.description}
                    </p>
                    {state === PhaseNavigatorState.Locked && (
                      <p className="text-xs text-amber-400 mt-1">Complete previous phases first</p>
                    )}
                    {state === PhaseNavigatorState.Completed && (
                      <p className="text-xs text-green-400 mt-1">Click to revisit</p>
                    )}
                  </TooltipContent>
                </Tooltip>

                {/* Connector */}
                {!isLast && (
                  <div
                    className={cn(
                      'flex items-center px-1',
                      index < currentIndex ? 'text-green-500/60' : 'text-zinc-700'
                    )}
                  >
                    <ChevronRight size={16} />
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500 rounded-full',
              currentPhase === PhaseNavigatorPhase.PREMISE && 'bg-purple-500 w-[33%]',
              currentPhase === PhaseNavigatorPhase.BREAKING && 'bg-blue-500 w-[66%]',
              currentPhase === PhaseNavigatorPhase.WRITING && 'bg-emerald-500 w-full',
              currentPhase === PhaseNavigatorPhase.COMPLETE && 'bg-green-500 w-full'
            )}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}

// Export for use in header/toolbar
export const PhaseNavigatorCompact: React.FC<Omit<PhaseNavigatorProps, 'compact'>> = props => (
  <PhaseNavigator {...props} compact />
)
