/**
 * Loop Creator State
 * 
 * State definition for the game loop creator multi-agent system.
 * Based on LangChain/LangGraph 2025 patterns.
 */

import { BaseMessage } from '@langchain/core/messages'

/**
 * A game mechanic node
 */
export interface MechanicNode {
  id: string
  name: string
  type: 'core' | 'secondary' | 'meta' | 'progression' | 'reward'
  description: string
  inputs: string[]           // What triggers this mechanic
  outputs: string[]          // What this mechanic produces
  balanceFactors: {
    effort: number           // 1-10 effort required
    reward: number           // 1-10 reward value
    frequency: number        // How often it occurs (per session)
  }
  examples?: string[]        // Reference examples from other games
  citations?: string[]       // RAG citations for grounding
}

/**
 * A connection between mechanics
 */
export interface MechanicEdge {
  id: string
  source: string             // Source mechanic ID
  target: string             // Target mechanic ID
  type: 'triggers' | 'enables' | 'requires' | 'conflicts' | 'enhances'
  label?: string
  weight?: number            // Strength of connection (1-10)
}

/**
 * A game loop (collection of mechanics forming a cycle)
 */
export interface GameLoop {
  id: string
  name: string
  type: 'core' | 'session' | 'progression' | 'meta' | 'social'
  description: string
  mechanics: string[]        // IDs of mechanics in this loop
  duration: {
    min: number              // Minimum minutes per cycle
    max: number              // Maximum minutes per cycle
    typical: number          // Typical minutes
  }
  playerExperience: string   // What the player feels
  satisfactionPeak: string   // When satisfaction is highest
}

/**
 * Balance analysis
 */
export interface BalanceAnalysis {
  overallScore: number       // 1-10 balance score
  issues: BalanceIssue[]
  recommendations: string[]
}

export interface BalanceIssue {
  severity: 'critical' | 'warning' | 'suggestion'
  type: 'reward_imbalance' | 'effort_mismatch' | 'loop_break' | 'dead_end' | 'grind_detected'
  description: string
  affectedMechanics: string[]
  suggestedFix?: string
}

/**
 * Progression system
 */
export interface ProgressionSystem {
  id: string
  name: string
  type: 'skill' | 'power' | 'content' | 'social' | 'collection'
  milestones: ProgressionMilestone[]
  curve: 'linear' | 'exponential' | 'logarithmic' | 's-curve' | 'stepped'
}

export interface ProgressionMilestone {
  id: string
  name: string
  requiredEffort: number     // Estimated hours to reach
  unlocksFeatures: string[]
  rewardType: string
  playerMotivation: string
}

/**
 * Loop Creator workflow phases
 */
export type LoopCreatorPhase =
  | 'initial'
  | 'planning'
  | 'mechanics_design'
  | 'loop_assembly'
  | 'balance_analysis'
  | 'progression_design'
  | 'review'
  | 'complete'

/**
 * Agent who should act next
 */
export type NextAgent =
  | 'supervisor'
  | 'loop_planner'
  | 'mechanics_designer'
  | 'balance_analyst'
  | 'progression_architect'
  | 'END'

/**
 * Agent action types for loop creator
 */
export type LoopAgentActionType =
  | 'ADD_MECHANIC'
  | 'UPDATE_MECHANIC'
  | 'DELETE_MECHANIC'
  | 'ADD_CONNECTION'
  | 'DELETE_CONNECTION'
  | 'CREATE_LOOP'
  | 'UPDATE_LOOP'
  | 'SET_BALANCE_ANALYSIS'
  | 'ADD_PROGRESSION_SYSTEM'
  | 'UPDATE_PROGRESSION_SYSTEM'
  | 'ASK_USER_QUESTION'

export interface LoopAgentAction {
  type: LoopAgentActionType
  payload: any
  confidence?: number
  reasoning?: string
}

export interface LoopAgentQuestion {
  id: string
  question: string
  options?: string[]
  context?: string
  required?: boolean
}

/**
 * Main state for Loop Creator graph
 */
export interface LoopCreatorState {
  // Session info
  projectId: string
  sessionId: string
  
  // Conversation
  messages: BaseMessage[]
  
  // Current phase and routing
  currentPhase: LoopCreatorPhase
  nextAgent: NextAgent
  roundCount: number
  
  // Game context
  gameGenre: string
  gamePlatform: string
  targetAudience: string
  gameDescription: string
  referenceGames: string[]
  
  // Design artifacts
  mechanics: MechanicNode[]
  connections: MechanicEdge[]
  loops: GameLoop[]
  progressionSystems: ProgressionSystem[]
  
  // Analysis
  balanceAnalysis: BalanceAnalysis | null
  
  // Agent coordination
  pendingActions: LoopAgentAction[]
  pendingQuestions: LoopAgentQuestion[]
  userAnswers: Record<string, string | string[]>
  
  // RAG context
  ragContext?: {
    gamePatterns: string[]
    similarGames: string[]
    citations: any[]
  }
  
  // Error handling
  errors: string[]
  
  // Model config (optional override)
  modelConfig?: {
    model: string
    temperature: number
  }
}

/**
 * Create initial state
 */
export function createInitialLoopState(
  projectId: string,
  message: string,
  context?: {
    gameGenre?: string
    gamePlatform?: string
    targetAudience?: string
    gameDescription?: string
    existingNodes?: MechanicNode[]
    existingEdges?: MechanicEdge[]
  }
): LoopCreatorState {
  const { HumanMessage } = require('@langchain/core/messages')
  
  return {
    projectId,
    sessionId: `loop-${Date.now()}`,
    messages: [new HumanMessage(message)],
    currentPhase: 'initial',
    nextAgent: 'supervisor',
    roundCount: 0,
    gameGenre: context?.gameGenre || '',
    gamePlatform: context?.gamePlatform || '',
    targetAudience: context?.targetAudience || '',
    gameDescription: context?.gameDescription || '',
    referenceGames: [],
    mechanics: context?.existingNodes || [],
    connections: context?.existingEdges || [],
    loops: [],
    progressionSystems: [],
    balanceAnalysis: null,
    pendingActions: [],
    pendingQuestions: [],
    userAnswers: {},
    errors: [],
  }
}

/**
 * State channel reducers for LangGraph
 */
export const loopCreatorChannels = {
  messages: {
    reducer: (existing: BaseMessage[], incoming: BaseMessage[]) => {
      return [...existing, ...incoming]
    },
    default: () => [],
  },
  mechanics: {
    reducer: (existing: MechanicNode[], incoming: MechanicNode[]) => {
      const byId = new Map(existing.map(m => [m.id, m]))
      for (const m of incoming) {
        byId.set(m.id, m)
      }
      return Array.from(byId.values())
    },
    default: () => [],
  },
  connections: {
    reducer: (existing: MechanicEdge[], incoming: MechanicEdge[]) => {
      const byId = new Map(existing.map(e => [e.id, e]))
      for (const e of incoming) {
        byId.set(e.id, e)
      }
      return Array.from(byId.values())
    },
    default: () => [],
  },
  loops: {
    reducer: (existing: GameLoop[], incoming: GameLoop[]) => {
      const byId = new Map(existing.map(l => [l.id, l]))
      for (const l of incoming) {
        byId.set(l.id, l)
      }
      return Array.from(byId.values())
    },
    default: () => [],
  },
  pendingActions: {
    reducer: (existing: LoopAgentAction[], incoming: LoopAgentAction[]) => {
      return [...existing, ...incoming]
    },
    default: () => [],
  },
  pendingQuestions: {
    reducer: (existing: LoopAgentQuestion[], incoming: LoopAgentQuestion[]) => {
      return [...existing, ...incoming]
    },
    default: () => [],
  },
  errors: {
    reducer: (existing: string[], incoming: string[]) => {
      return [...new Set([...existing, ...incoming])]
    },
    default: () => [],
  },
  // Simple overwrites for the rest
  projectId: { reducer: (_, incoming: string) => incoming, default: () => '' },
  sessionId: { reducer: (_, incoming: string) => incoming, default: () => '' },
  currentPhase: { reducer: (_, incoming: LoopCreatorPhase) => incoming, default: () => 'initial' as LoopCreatorPhase },
  nextAgent: { reducer: (_, incoming: NextAgent) => incoming, default: () => 'supervisor' as NextAgent },
  roundCount: { reducer: (_, incoming: number) => incoming, default: () => 0 },
  gameGenre: { reducer: (_, incoming: string) => incoming, default: () => '' },
  gamePlatform: { reducer: (_, incoming: string) => incoming, default: () => '' },
  targetAudience: { reducer: (_, incoming: string) => incoming, default: () => '' },
  gameDescription: { reducer: (_, incoming: string) => incoming, default: () => '' },
  referenceGames: { reducer: (_, incoming: string[]) => incoming, default: () => [] },
  progressionSystems: { reducer: (_, incoming: ProgressionSystem[]) => incoming, default: () => [] },
  balanceAnalysis: { reducer: (_, incoming: BalanceAnalysis | null) => incoming, default: () => null },
  userAnswers: { reducer: (_, incoming: Record<string, string | string[]>) => incoming, default: () => ({}) },
  ragContext: { reducer: (_, incoming: any) => incoming, default: () => undefined },
  modelConfig: { reducer: (_, incoming: any) => incoming, default: () => undefined },
}

