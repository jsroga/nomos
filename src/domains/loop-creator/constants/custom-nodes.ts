/** Loop creator graph node display constants. */

export enum LoopNodeType {
  Challenge = 'challenge',
  Action = 'action',
  Reward = 'reward',
  Feedback = 'feedback',
}

export enum LoopTimeframe {
  Micro = 'micro',
  Core = 'core',
  Session = 'session',
  Meta = 'meta',
  Progression = 'progression',
}

export enum LoopPlayerAgency {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export const LOOP_NODE_COLORS: Record<LoopNodeType, string> = {
  [LoopNodeType.Challenge]: '#ff4444',
  [LoopNodeType.Action]: '#4488ff',
  [LoopNodeType.Reward]: '#ffcc00',
  [LoopNodeType.Feedback]: '#44dd66',
}

export const LOOP_NODE_ICONS: Record<LoopNodeType, string> = {
  [LoopNodeType.Challenge]: '⚔️',
  [LoopNodeType.Action]: '🎮',
  [LoopNodeType.Reward]: '⭐',
  [LoopNodeType.Feedback]: '📊',
}

export const LOOP_NODE_DEFAULT_COLOR = '#666'
export const LOOP_NODE_DEFAULT_ICON = '●'
export const LOOP_HANDLE_BORDER = '2px solid #1a1a24'
export const LOOP_DURATION_UNIT = 'min'

export const LOOP_TIMEFRAME_TEXT_CLASS: Record<LoopTimeframe, string> = {
  [LoopTimeframe.Micro]: 'text-cyan-400',
  [LoopTimeframe.Core]: 'text-emerald-400',
  [LoopTimeframe.Session]: 'text-amber-400',
  [LoopTimeframe.Meta]: 'text-purple-400',
  [LoopTimeframe.Progression]: 'text-rose-400',
}
