/**
 * PhaseNavigator - Unified Phase & View Navigation
 */

import React from 'react'
import { cn } from '@/shared/data/utils'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { FileText, Pencil, ChevronRight } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'
import type { PhaseId } from '@/domains/storyteller/core/types/enums'
import {
  PhaseNavigatorColor,
  PhaseNavigatorDescription,
  PhaseNavigatorLabel,
  PhaseNavigatorLockedHint,
  PhaseNavigatorPhase,
  PhaseNavigatorShortLabel,
  PhaseNavigatorState,
  PHASE_NAVIGATOR_ACTIVE_STYLE,
  PHASE_NAVIGATOR_COMPLETED_STYLE,
} from '@/domains/storyteller/ui/PhaseNavigator/constants/phase-navigator'
import {
  getCompactPhaseButtonClass,
  getFullPhaseButtonClass,
  PhaseFullStepIcon,
  PhaseStepIcon,
} from './PhaseStepButton'
import {
  canNavigatePhase,
  getPhaseNavigatorState,
  phaseNavigatorProgressIndex,
} from './get-phase-state'

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

function BeatsGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 5.5h4.5v13H4zM9.75 5.5h4.5v8.5h-4.5zM15.5 5.5H20v16h-4.5z" />
    </svg>
  )
}

const PHASES: PhaseConfig[] = [
  {
    id: PhaseNavigatorPhase.PREMISE,
    label: PhaseNavigatorLabel.Premise,
    shortLabel: PhaseNavigatorShortLabel.Premise,
    icon: <FileText size={13} strokeWidth={1.7} />,
    color: PhaseNavigatorColor.Premise,
    activeColor: PHASE_NAVIGATOR_ACTIVE_STYLE,
    completedColor: PHASE_NAVIGATOR_COMPLETED_STYLE,
    description: PhaseNavigatorDescription.Premise,
  },
  {
    id: PhaseNavigatorPhase.BREAKING,
    label: PhaseNavigatorLabel.Break,
    shortLabel: PhaseNavigatorShortLabel.Break,
    icon: <BeatsGlyph />,
    color: PhaseNavigatorColor.Break,
    activeColor: PHASE_NAVIGATOR_ACTIVE_STYLE,
    completedColor: PHASE_NAVIGATOR_COMPLETED_STYLE,
    description: PhaseNavigatorDescription.Break,
  },
  {
    id: PhaseNavigatorPhase.WRITING,
    label: PhaseNavigatorLabel.Write,
    shortLabel: PhaseNavigatorShortLabel.Write,
    icon: <Pencil size={13} strokeWidth={1.7} />,
    color: PhaseNavigatorColor.Write,
    activeColor: PHASE_NAVIGATOR_ACTIVE_STYLE,
    completedColor: PHASE_NAVIGATOR_COMPLETED_STYLE,
    description: PhaseNavigatorDescription.Write,
  },
]

interface PhaseNavigatorProps {
  currentPhase: PhaseId
  /** Furthest unlocked phase (progress). Defaults to currentPhase. */
  progressPhase?: PhaseId
  /** Next phase the user can enter (e.g. Draft after beats exist). */
  advanceablePhase?: PhaseId
  completedPhases?: PhaseId[]
  isWorking?: boolean
  onPhaseChange?: (phase: PhaseId) => void
  onGoBack?: () => void
  compact?: boolean
  episodeTitle?: string
}

function compactPhaseAriaLabel(
  state: `${PhaseNavigatorState}`,
  label: string,
  lockedHint: string,
): string {
  if (state === PhaseNavigatorState.Locked) return lockedHint
  if (state === PhaseNavigatorState.Ready) return PhaseNavigatorLockedHint.ContinueToDraft
  return label
}

const CompactPhaseNavigator: React.FC<PhaseNavigatorProps> = ({
  currentPhase,
  progressPhase,
  advanceablePhase,
  isWorking = false,
  onPhaseChange,
}) => {
  const progressIndex = phaseNavigatorProgressIndex(progressPhase ?? currentPhase)

  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5" role="list">
        {PHASES.map((phase, index) => {
          const state = getPhaseNavigatorState({
            phaseId: phase.id,
            index,
            viewPhase: currentPhase,
            progressIndex,
            advanceablePhase,
          })
          const canNav = canNavigatePhase(state, isWorking)
          const lockedHint =
            phase.id === PhaseNavigatorPhase.WRITING
              ? PhaseNavigatorLockedHint.Draft
              : PhaseNavigatorLockedHint.Default

          return (
            <React.Fragment key={phase.id}>
              {index > 0 ? <span aria-hidden className="w-3 h-px bg-border mx-0.5" /> : null}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type={HtmlElementType.Button}
                    onClick={() => canNav && onPhaseChange?.(phase.id)}
                    disabled={!canNav}
                    aria-current={state === PhaseNavigatorState.Active ? 'step' : undefined}
                    aria-disabled={state === PhaseNavigatorState.Locked}
                    aria-label={compactPhaseAriaLabel(state, phase.label, lockedHint)}
                    title={state === PhaseNavigatorState.Locked ? lockedHint : undefined}
                    className={getCompactPhaseButtonClass(phase, state, canNav)}
                  >
                    <PhaseStepIcon state={state} phase={phase} isWorking={isWorking} />
                    <span>{phase.shortLabel}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="font-medium">{phase.label}</p>
                  <p className="text-xs text-zinc-300">{phase.description}</p>
                  {state === PhaseNavigatorState.Locked && (
                    <p className="text-xs text-amber-300 mt-1">{lockedHint}</p>
                  )}
                  {state === PhaseNavigatorState.Ready && (
                    <p className="text-xs text-primary mt-1">{PhaseNavigatorLockedHint.ContinueToDraft}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </React.Fragment>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

const FullPhaseNavigator: React.FC<PhaseNavigatorProps> = ({
  currentPhase,
  progressPhase,
  advanceablePhase,
  isWorking = false,
  onPhaseChange,
  episodeTitle,
}) => {
  const progressIndex = phaseNavigatorProgressIndex(progressPhase ?? currentPhase)

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        {episodeTitle && (
          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{episodeTitle}</div>
        )}

        <div className="flex items-center gap-0">
          {PHASES.map((phase, index) => {
            const state = getPhaseNavigatorState({
              phaseId: phase.id,
              index,
              viewPhase: currentPhase,
              progressIndex,
              advanceablePhase,
            })
            const canNav = canNavigatePhase(state, isWorking)
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
                      <p className="text-xs text-amber-300 mt-1">{PhaseNavigatorLockedHint.Default}</p>
                    )}
                    {state === PhaseNavigatorState.Ready && (
                      <p className="text-xs text-primary mt-1">{PhaseNavigatorLockedHint.ContinueToDraft}</p>
                    )}
                    {state === PhaseNavigatorState.Completed && (
                      <p className="text-xs text-green-300 mt-1">{PhaseNavigatorLockedHint.ClickToView}</p>
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
