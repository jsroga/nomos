/**
 * Loop Creator State
 *
 * State definition for the game loop creator multi-agent system.
 * Based on LangChain/LangGraph 2025 patterns.
 */

import { BaseMessage, HumanMessage } from '@/shared/chat/core/message'
import type { ProjectScope } from '@/shared/auth/project-scope'
import type { MarketAnalysisReport } from '@/domains/loop-creator/ai/agents/market-analyst/types'
import {
  CANVAS_NODE_TYPE_GROUP,
  LOOP_CREATOR_PHASE_INITIAL,
  NEXT_AGENT_SUPERVISOR,
} from '@/domains/loop-creator/constants/graph-state-defaults'
import { readString, recordFromJson } from '@/shared/data/json-guards'

/**
 * A game mechanic node
 */
export interface MechanicNode {
  id: string
  name: string
  type: 'core' | 'secondary' | 'meta' | 'progression' | 'reward'
  description: string
  inputs: string[] // What triggers this mechanic
  outputs: string[] // What this mechanic produces
  balanceFactors: {
    effort: number // 1-10 effort required
    reward: number // 1-10 reward value
    frequency: number // How often it occurs (per session)
  }
  examples?: string[] // Reference examples from other games
  citations?: string[] // RAG citations for grounding
}

/**
 * A connection between mechanics
 */
export interface MechanicEdge {
  id: string
  source: string // Source mechanic ID
  target: string // Target mechanic ID
  type: 'triggers' | 'enables' | 'requires' | 'conflicts' | 'enhances'
  label?: string
  weight?: number // Strength of connection (1-10)
}

enum MechanicNodeType {
  CORE = 'core',
  SECONDARY = 'secondary',
  META = 'meta',
  PROGRESSION = 'progression',
  REWARD = 'reward',
}

const MECHANIC_NODE_TYPE_VALUES = new Set<string>(Object.values(MechanicNodeType))

function parseMechanicNodeType(value: unknown): MechanicNode['type'] {
  const raw = readString(value)
  if (raw && MECHANIC_NODE_TYPE_VALUES.has(raw)) {
    for (const entry of Object.values(MechanicNodeType)) {
      if (entry === raw) return entry
    }
  }
  return MechanicNodeType.CORE
}

enum MechanicEdgeType {
  TRIGGERS = 'triggers',
  ENABLES = 'enables',
  REQUIRES = 'requires',
  CONFLICTS = 'conflicts',
  ENHANCES = 'enhances',
}

const MECHANIC_EDGE_TYPE_VALUES = new Set<string>(Object.values(MechanicEdgeType))

export function parseMechanicEdgeType(value: unknown): MechanicEdge['type'] {
  const raw = readString(value)
  if (raw && MECHANIC_EDGE_TYPE_VALUES.has(raw)) {
    for (const entry of Object.values(MechanicEdgeType)) {
      if (entry === raw) return entry
    }
  }
  return MechanicEdgeType.TRIGGERS
}

function mechanicNodeFromCanvasNode(node: Record<string, unknown>): MechanicNode {
  const data = recordFromJson(node.data)
  return {
    id: readString(node.id) ?? '',
    name: readString(node.label) ?? readString(data.label) ?? readString(node.id) ?? '',
    type: parseMechanicNodeType(data.nodeType ?? node.type),
    description: readString(data.description) ?? readString(node.description) ?? '',
    inputs: [],
    outputs: [],
    balanceFactors: { effort: 5, reward: 5, frequency: 5 },
  }
}

function mechanicEdgeFromCanvasEdge(edge: Record<string, unknown>): MechanicEdge {
  return {
    id: readString(edge.id) ?? '',
    source: readString(edge.source) ?? '',
    target: readString(edge.target) ?? '',
    type: parseMechanicEdgeType(edge.type),
    label: readString(edge.label) ?? '',
  }
}

/**
 * A game loop (collection of mechanics forming a cycle)
 */
export interface GameLoopNode {
  name: string
  psychPhase: 'challenge' | 'action' | 'feedback'
  description: string
}

export interface GameLoop {
  id: string
  name: string
  type: 'core' | 'session' | 'progression' | 'meta' | 'social'
  timeframe?: 'micro' | 'core' | 'session' | 'meta' // Duration category
  description: string
  mechanics: string[] // IDs of mechanics in this loop
  nodes?: GameLoopNode[] // Psychological phase nodes (challenge -> action -> feedback)
  duration: {
    min: number // Minimum minutes per cycle
    max: number // Maximum minutes per cycle
    typical: number // Typical minutes
    unit?: 'seconds' | 'minutes'
  }
  playerExperience: string // What the player feels
  satisfactionPeak: string // When satisfaction is highest
}

/**
 * Balance analysis
 */
export interface BalanceAnalysis {
  overallScore: number // 1-10 balance score
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
  requiredEffort: number // Estimated hours to reach
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
  | 'market_analyst'
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
  // Canvas modification actions
  | 'ADD_NODE'
  | 'REMOVE_NODE'
  | 'REMOVE_ALL_NODES'
  | 'MODIFY_NODE'
  | 'ADD_EDGE'
  | 'REMOVE_EDGE'
  | 'MODIFY_EDGE'
  // UI notification actions
  | 'MARKET_ANALYSIS_COMPLETE'

export interface LoopAgentAction {
  type: LoopAgentActionType
  payload: Record<string, unknown>
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
  /** The project this run is for, and proof the caller may spend on it. */
  scope: ProjectScope
  sessionId: string

  // Conversation
  messages: BaseMessage[]

  // Current phase and routing
  currentPhase: LoopCreatorPhase
  nextAgent: NextAgent
  lastAgent: NextAgent | null // Track who just executed
  roundCount: number

  // Game context
  gameGenre: string
  gamePlatform: string
  targetAudience: string
  gameDescription: string
  referenceGames: string[]
  selectedTimeframes: ('micro' | 'core' | 'session' | 'meta')[] // User-selected loop timeframes

  // Design artifacts
  mechanics: MechanicNode[]
  connections: MechanicEdge[]
  loops: GameLoop[]
  progressionSystems: ProgressionSystem[]

  // Analysis
  balanceAnalysis: BalanceAnalysis | null
  marketAnalysis?: MarketAnalysisReport

  // Agent coordination
  pendingActions: LoopAgentAction[]
  pendingQuestions: LoopAgentQuestion[]
  userAnswers: Record<string, string | string[]>

  // RAG context
  ragContext?: {
    gamePatterns: string[]
    similarGames: string[]
    citations: Record<string, unknown>[]
  }

  // Error handling
  errors: string[]

  // Model config (optional override)
  modelConfig?: {
    model: string
    temperature: number
  }

  // Concept alignment evaluation (auto-eval)
  conceptEvaluation?: {
    overallAlignment: number
    conceptMatch: {
      score: number
      reasoning: string
      matchedElements: string[]
      missingElements: string[]
    }
    genreAccuracy: {
      score: number
      detectedGenre: string
      expectedGenre: string
      reasoning: string
    }
    mechanicsRelevance: Array<{
      mechanicName: string
      relevanceScore: number
      reasoning: string
    }>
    suggestions: Array<{
      type: 'add' | 'modify' | 'remove'
      description: string
      priority: 'high' | 'medium' | 'low'
    }>
    summary: string
  }
}

/**
 * Create initial state
 */
export function createInitialLoopState(
  scope: ProjectScope,
  message: string,
  context?: {
    gameGenre?: string
    gamePlatform?: string
    targetAudience?: string
    gameDescription?: string
    existingNodes?: Record<string, unknown>[]
    existingEdges?: Record<string, unknown>[]
  }
): LoopCreatorState {
  // Convert canvas nodes to mechanics format
  const mechanics: MechanicNode[] = (context?.existingNodes || [])
    .filter((n: Record<string, unknown>) => n.type !== CANVAS_NODE_TYPE_GROUP)
    .map((n: Record<string, unknown>) => mechanicNodeFromCanvasNode(n))

  const connections: MechanicEdge[] = (context?.existingEdges || []).map(
    (e: Record<string, unknown>) => mechanicEdgeFromCanvasEdge(e)
  )

  return {
    scope,
    sessionId: `loop-${Date.now()}`,
    messages: [new HumanMessage(message)],
    currentPhase: LOOP_CREATOR_PHASE_INITIAL,
    nextAgent: NEXT_AGENT_SUPERVISOR,
    lastAgent: null,
    roundCount: 0,
    gameGenre: context?.gameGenre || '',
    gamePlatform: context?.gamePlatform || '',
    targetAudience: context?.targetAudience || '',
    gameDescription: context?.gameDescription || '',
    referenceGames: [],
    selectedTimeframes: [], // User-selected loop timeframes (micro, core, session, meta)
    mechanics,
    connections,
    loops: [],
    progressionSystems: [],
    balanceAnalysis: null,
    pendingActions: [],
    pendingQuestions: [],
    userAnswers: {},
    errors: [],
  }
}

export { loopCreatorChannels } from './loop-creator-channels'
