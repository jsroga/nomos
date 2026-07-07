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
    id: 'premise',
    label: 'Premise',
    shortLabel: 'PREMISE',
    icon: <Sparkles size={14} />,
    color: 'text-purple-400',
    activeColor:
      'bg-transparent border-purple-400 text-white shadow-[0_0_15px_rgba(192,132,252,0.5)]',
    completedColor:
      'bg-transparent border-purple-500/40 text-purple-400 hover:border-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.2)]',
    description: 'Define the hook, stakes, and transformation',
  },
  {
    id: 'breaking',
    label: 'Break',
    shortLabel: 'BREAK',
    icon: <LayoutGrid size={14} />,
    color: 'text-blue-400',
    activeColor: 'bg-transparent border-blue-400 text-white shadow-[0_0_15px_rgba(96,165,250,0.5)]',
    completedColor:
      'bg-transparent border-blue-500/40 text-blue-400 hover:border-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.2)]',
    description: 'Structure beats and scenes',
  },
  {
    id: 'writing',
    label: 'Write',
    shortLabel: 'WRITE',
    icon: <PenTool size={14} />,
    color: 'text-emerald-400',
    activeColor:
      'bg-transparent border-emerald-400 text-white shadow-[0_0_15px_rgba(52,211,153,0.5)]',
    completedColor:
      'bg-transparent border-emerald-500/40 text-emerald-400 hover:border-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.2)]',
    description: 'Draft the script',
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
  onGoBack,
  compact = false,
  episodeTitle,
}) => {
  const currentIndex = PHASES.findIndex(p => p.id === currentPhase)

  const getPhaseState = (phase: PhaseConfig, index: number): 'completed' | 'active' | 'locked' => {
    if (completedPhases.includes(phase.id)) return 'completed'
    if (phase.id === currentPhase) return 'active'
    if (index < currentIndex) return 'completed' // Phases before current are accessible
    return 'locked'
  }

  const canNavigateTo = (phase: PhaseConfig, index: number): boolean => {
    if (isWorking) return false
    const state = getPhaseState(phase, index)
    return state === 'completed' || state === 'active'
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
                      state === 'active' && phase.activeColor,
                      state === 'completed' && phase.completedColor,
                      state === 'locked' &&
                        'text-zinc-600 cursor-not-allowed border border-transparent',
                      canNav && state !== 'active' && 'hover:scale-105',
                      'border-2' // Match Web button border width
                    )}
                  >
                    {state === 'completed' ? (
                      <Check size={12} className="text-green-400" />
                    ) : state === 'locked' ? (
                      <Lock size={10} className="opacity-50" />
                    ) : isWorking && state === 'active' ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      phase.icon
                    )}
                    <span>{phase.shortLabel}</span>

                    {/* Active indicator dot */}
                    {state === 'active' && (
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
                  {state === 'locked' && (
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
                        state === 'active' && [
                          phase.activeColor,
                          'shadow-lg shadow-current/20',
                          'scale-105',
                        ],
                        state === 'completed' && [
                          'bg-zinc-800/60 border-zinc-700/80 text-zinc-300',
                          'hover:bg-zinc-700/60 hover:border-zinc-600',
                          'cursor-pointer',
                        ],
                        state === 'locked' && [
                          'bg-zinc-900/30 border-zinc-800/50 text-zinc-600',
                          'cursor-not-allowed opacity-60',
                        ]
                      )}
                    >
                      {/* Icon with state indicator */}
                      <span
                        className={cn(
                          'flex items-center justify-center w-6 h-6 rounded-full',
                          state === 'active' && 'bg-current/20',
                          state === 'completed' && 'bg-green-500/20',
                          state === 'locked' && 'bg-zinc-800/50'
                        )}
                      >
                        {state === 'completed' ? (
                          <Check size={14} className="text-green-400" />
                        ) : state === 'locked' ? (
                          <Lock size={12} />
                        ) : isWorking && state === 'active' ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          phase.icon
                        )}
                      </span>

                      {/* Label */}
                      <span className="hidden sm:inline">{phase.label}</span>
                      <span className="sm:hidden">{phase.shortLabel}</span>

                      {/* Working indicator */}
                      {isWorking && state === 'active' && (
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
                    {state === 'locked' && (
                      <p className="text-xs text-amber-400 mt-1">Complete previous phases first</p>
                    )}
                    {state === 'completed' && (
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
              currentPhase === 'premise' && 'bg-purple-500 w-[33%]',
              currentPhase === 'breaking' && 'bg-blue-500 w-[66%]',
              currentPhase === 'writing' && 'bg-emerald-500 w-full',
              currentPhase === 'complete' && 'bg-green-500 w-full'
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
