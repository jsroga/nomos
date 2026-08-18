/** Phase navigator UI wire values. */

import { Phase } from '@/domains/storyteller/core/types/enums'

export { Phase as PhaseNavigatorPhase }

export enum PhaseNavigatorState {
  Completed = 'completed',
  Active = 'active',
  Unlocked = 'unlocked',
  Ready = 'ready',
  Locked = 'locked',
}

export enum PhaseNavigatorLabel {
  Premise = 'Premise',
  Break = 'Beats',
  Write = 'Draft',
}

export enum PhaseNavigatorShortLabel {
  Premise = 'PREMISE',
  Break = 'BEATS',
  Write = 'DRAFT',
}

export enum PhaseNavigatorDescription {
  Premise = 'Define the hook, stakes, and transformation',
  Break = 'Structure beats and scenes',
  Write = 'Draft the script',
}

export enum PhaseNavigatorColor {
  Premise = 'text-purple-400',
  Break = 'text-blue-400',
  Write = 'text-emerald-400',
}

export const PHASE_NAVIGATOR_ACTIVE_STYLE =
  'bg-primary/16 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.4)] text-primary'
export const PHASE_NAVIGATOR_COMPLETED_STYLE = 'text-foreground/80'

export enum PhaseNavigatorLockedHint {
  Default = 'Complete previous phases first',
  Draft = 'Complete Beats to unlock Draft',
  ContinueToDraft = 'Continue to Draft',
  ClickToView = 'Click to view',
}

export enum PhaseNavigatorCompactButtonClass {
  Base = 'relative flex items-center gap-[7px] px-[11px] py-[5px] rounded-[7px] font-mono text-[10.5px] tracking-[0.12em] uppercase transition-all duration-150 ease-in-out',
  Locked = 'text-muted-foreground/45 cursor-not-allowed',
  Current = 'bg-primary/16 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.4)] text-primary',
  Ready = 'text-primary hover:bg-primary/10 cursor-pointer',
  Complete = 'text-foreground/80',
  Upcoming = 'text-muted-foreground/80',
}

export enum PhaseNavigatorFullButtonClass {
  Base = 'relative flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-all duration-300',
  Border = 'border-2 rounded-md',
  ActiveScale = 'scale-105',
  CompletedPointer = 'cursor-pointer',
  Locked = 'cursor-not-allowed opacity-60',
}
