/** Phase navigator UI wire values. */

import { Phase } from '@/domains/storyteller/core/types/enums'

export { Phase as PhaseNavigatorPhase }

export enum PhaseNavigatorState {
  Completed = 'completed',
  Active = 'active',
  Locked = 'locked',
}

export enum PhaseNavigatorLabel {
  Premise = 'Premise',
  Break = 'Break',
  Write = 'Write',
}

export enum PhaseNavigatorShortLabel {
  Premise = 'PREMISE',
  Break = 'BREAK',
  Write = 'WRITE',
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

export enum PhaseNavigatorActiveStyle {
  Premise = 'bg-transparent border-purple-400 text-white shadow-[0_0_15px_rgba(192,132,252,0.5)]',
  Break = 'bg-transparent border-blue-400 text-white shadow-[0_0_15px_rgba(96,165,250,0.5)]',
  Write = 'bg-transparent border-emerald-400 text-white shadow-[0_0_15px_rgba(52,211,153,0.5)]',
}

export enum PhaseNavigatorCompletedStyle {
  Premise = 'bg-transparent border-purple-500/40 text-purple-400 hover:border-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.2)]',
  Break = 'bg-transparent border-blue-500/40 text-blue-400 hover:border-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.2)]',
  Write = 'bg-transparent border-emerald-500/40 text-emerald-400 hover:border-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.2)]',
}
