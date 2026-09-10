import type { GameLoop, GameLoopNode } from '../../core/graph/state'

export enum LoopPlannerLoopType {
  Core = 'core',
  Session = 'session',
  Meta = 'meta',
  Progression = 'progression',
  Social = 'social',
}

export enum LoopPlannerTimeframe {
  Micro = 'micro',
  Core = 'core',
  Session = 'session',
  Meta = 'meta',
  Progression = 'progression',
}

export enum LoopPlannerPsychPhase {
  Challenge = 'challenge',
  Action = 'action',
  Feedback = 'feedback',
}

export enum LoopPlannerDurationUnit {
  Seconds = 'seconds',
  Minutes = 'minutes',
}

export enum LoopPlannerNodeType {
  Challenge = 'challenge',
  Action = 'action',
  Reward = 'reward',
  Group = 'group',
}

export enum LoopPlannerActionType {
  AddNode = 'ADD_NODE',
  AddEdge = 'ADD_EDGE',
}

export enum LoopPlannerHandle {
  Bottom = 'bottom',
  Top = 'top',
  RightOut = 'right-out',
  RightIn = 'right-in',
}

export enum LoopPlannerEdgeStyle {
  Dashed = 'dashed',
  Thick = 'thick',
}

export enum LoopPlannerCanvasCopy {
  UnknownDuration = '?',
  LoopReasoningSuffix = ' LOOP: ',
  LoopClosure = 'Loop closure: feeds back to start',
  FeedsInto = ' feeds into ',
  LoopSymbol = '↺',
  FeedArrow = '→',
  GroupIdPrefix = 'group-',
  EdgeIdPrefix = 'edge-',
  EdgeLoopPrefix = 'edge-loop-',
  EdgeGroupPrefix = 'edge-group-',
}

export enum LoopPlannerCopy {
  UnnamedLoop = 'Unnamed Loop',
  ContinueRefining = 'Continue refining the loop structure',
}

export const LOOP_PLANNER_TYPES: LoopPlannerLoopType[] = [
  LoopPlannerLoopType.Core,
  LoopPlannerLoopType.Session,
  LoopPlannerLoopType.Meta,
  LoopPlannerLoopType.Progression,
  LoopPlannerLoopType.Social,
]

export const LOOP_PLANNER_TIMEFRAMES: LoopPlannerTimeframe[] = [
  LoopPlannerTimeframe.Micro,
  LoopPlannerTimeframe.Core,
  LoopPlannerTimeframe.Session,
  LoopPlannerTimeframe.Meta,
]

export const LOOP_PLANNER_PSYCH_PHASES: LoopPlannerPsychPhase[] = [
  LoopPlannerPsychPhase.Challenge,
  LoopPlannerPsychPhase.Action,
  LoopPlannerPsychPhase.Feedback,
]

export const LOOP_PLANNER_TIMEFRAME_ORDER: LoopPlannerTimeframe[] = [
  LoopPlannerTimeframe.Micro,
  LoopPlannerTimeframe.Core,
  LoopPlannerTimeframe.Session,
  LoopPlannerTimeframe.Meta,
  LoopPlannerTimeframe.Progression,
]

export const PHASE_TO_NODE_TYPE: Record<GameLoopNode['psychPhase'], LoopPlannerNodeType> = {
  [LoopPlannerPsychPhase.Challenge]: LoopPlannerNodeType.Challenge,
  [LoopPlannerPsychPhase.Action]: LoopPlannerNodeType.Action,
  [LoopPlannerPsychPhase.Feedback]: LoopPlannerNodeType.Reward,
}

export const LOOP_PLANNER_FALLBACK_LOOPS: Omit<GameLoop, 'id'>[] = [
  {
    name: 'Core Gameplay Loop',
    type: LoopPlannerLoopType.Core,
    description: 'Primary moment-to-moment gameplay',
    mechanics: [],
    duration: { min: 1, max: 5, typical: 3 },
    playerExperience: 'Immediate engagement',
    satisfactionPeak: 'Completing micro-objectives',
  },
  {
    name: 'Session Loop',
    type: LoopPlannerLoopType.Session,
    description: 'Goals achievable within a play session',
    mechanics: [],
    duration: { min: 15, max: 45, typical: 30 },
    playerExperience: 'Progress toward larger goals',
    satisfactionPeak: 'Completing missions or levels',
  },
  {
    name: 'Meta Progression Loop',
    type: LoopPlannerLoopType.Meta,
    description: 'Long-term progression across sessions',
    mechanics: [],
    duration: { min: 60, max: 300, typical: 120 },
    playerExperience: 'Character/story advancement',
    satisfactionPeak: 'Major milestones',
  },
]

export enum LoopPlannerJsonKey {
  Name = 'name',
  Description = 'description',
  Id = 'id',
  Type = 'type',
  Timeframe = 'timeframe',
  Mechanics = 'mechanics',
  Duration = 'duration',
  PlayerExperience = 'playerExperience',
  SatisfactionPeak = 'satisfactionPeak',
  Nodes = 'nodes',
  PsychPhase = 'psychPhase',
  Min = 'min',
  Max = 'max',
  Typical = 'typical',
  Unit = 'unit',
  Analysis = 'analysis',
  Loops = 'loops',
  Recommendations = 'recommendations',
  Message = 'message',
}
