import { BaseMessage } from '@langchain/core/messages'
import { EpisodePremise, StoryPlan } from '../schemas/agent-schemas'
import { BeatType, BeatStatus, Phase, PlanStatus, Verdict } from '../enums'

export interface BeatCard {
  id: string
  episodeId: string
  sequence: number
  logline: string
  content?: string
  beatType: BeatType
  charactersInvolved: string[]
  emotionalShifts: Record<string, { from: string; to: string }>
  visualHook: string
  causalDependencies: string[]
  setupsPayoffs: { setupId?: string; payoffFor?: string }
  status: BeatStatus
  // Mazur Benchmark elements
  mazurElements?: {
    character?: string // Deepened trait
    object?: string // Physical prop
    coreConcept?: string // Theme reinforcement
    attribute?: string // Sensory detail
    action?: string // Active verb
    method?: string // How they do it
    setting?: string // Environment
    timeframe?: string // Time pressure
    motivation?: string // Why
    tone?: string // Atmosphere
  }

  // Storyboard elements
  imageUrl?: string
  imagePrompt?: string
}

// Character metrics that can change per beat
// Based on: Affective Circumplex Model (Russell, 1980) + Self-Determination Theory (Deci & Ryan)
export interface CharacterMetrics {
  // Core Affective State (Emotional Circumplex)
  valence: number // -100 to +100 - Negative to positive emotional tone
  arousal: number // 0-100 - Energy/activation level

  // Psychological Needs (Self-Determination Theory)
  autonomy: number // 0-100 - Perceived freedom and self-direction
  competence: number // 0-100 - Belief in capability to handle challenges
  relatedness: number // 0-100 - Sense of connection to others

  // Cognitive & Threat Assessment
  cognitiveClarity: number // 0-100 - Mental sharpness and decision-making capacity
  perceivedStakes: number // 0-100 - How much they believe is on the line

  // Social & Moral Mechanisms
  socialSafety: number // 0-100 - Perceived safety in current social context
  moralAlignment: number // 0-100 - Alignment between actions and values

  // Character Arc (kept separate from moment-to-moment emotional state)
  transformation: number // 0-100 - Progress along character arc
}

export interface CharacterState {
  characterId: string
  name: string
  currentGoals: string[]
  fears: string[]
  selfDelusion: string // What they tell themselves
  actualMotivation: string // What's really driving them
  knowledgeState: string[] // List of things they know

  role?: string
  description?: string
  archetype?: string
  traits?: string[]

  // Numeric metrics (all 0-100)
  metrics: CharacterMetrics

  // History tracking
  metricsHistory: {
    beatId: string
    beatSequence: number
    changes: Partial<CharacterMetrics>
    reason: string
    timestamp: number
  }[]
}

// Changes a beat makes to characters
export interface BeatCharacterImpact {
  characterId: string
  characterName: string
  metricChanges: Partial<CharacterMetrics>
  emotionalShift?: { from: string; to: string }
  newKnowledge?: string[] // Things the character learns
  justification: string // Why these changes happen
}

// Default metrics for a new character (psychologically neutral baseline)
export const DEFAULT_CHARACTER_METRICS: CharacterMetrics = {
  valence: 0, // Neutral emotional tone
  arousal: 50, // Moderate energy
  autonomy: 60, // Reasonably free
  competence: 60, // Reasonably capable
  relatedness: 50, // Moderately connected
  cognitiveClarity: 70, // Thinking clearly
  perceivedStakes: 40, // Moderate stakes
  socialSafety: 60, // Reasonably safe
  moralAlignment: 70, // Mostly aligned with values
  transformation: 0, // Beginning of arc
}

export interface Setup {
  id: string
  description: string
  beatId: string
  isResolved: boolean
  payoffBeatId?: string
}

// Phase type is now imported from enums.ts
export { Phase }

export interface WritersRoomState {
  // Project Context
  projectId: string
  episodeId?: string
  userEmail?: string // For permission checks (e.g., Bible lock)

  // Phase Management
  currentPhase: Phase
  phaseIterations: number // Iterations within current phase
  maxIterationsPerPhase: number

  // Content
  seriesBible: StoryPlan
  masterPrompt?: string // The user's master instructions for the series
  episodePrompt?: string // Specific instructions for this episode
  episodePremise?: EpisodePremise
  characters: CharacterState[]
  activeCast?: string[] // IDs of characters currently relevant/in-scene
  beatBoard: BeatCard[]
  currentBeat?: BeatCard // Beat being deliberated

  // Tracking
  unresolvedSetups: Setup[]
  rejectedBeats: BeatCard[]

  // Script (for writing phase)
  script?: string
  scriptVersion?: number

  // Agent Communication
  messages: BaseMessage[]

  // Control
  awaitingUserInput: boolean // Pause for user intervention
  lastAction?: string // Last agent action taken
  shouldTerminate: boolean // Signal to stop

  // Self-reflection and critique tracking
  beatChallengeCount: number // How many times current beat was challenged
  lastDevilVerdict?: Verdict
  reflectionNotes?: string[] // Notes from reflection process
  minConfidenceThreshold: number // Minimum confidence to accept (0-1)
  lastAgentConfidence?: number // Last agent's confidence score

  // Script evaluation (Evaluator-Optimizer loop)
  lastScriptVerdict?: Verdict
  scriptRevisionCount: number // How many times script was revised
  scriptFeedback?: string[] // Feedback from script editor for revision

  // Deep Agent State (Meta-Cognition)
  plan: PlanItem[] // Structured list of tasks
  deepMemory: Record<string, any> // Persistent cross-agent context
  memory: Record<string, any> // Agentic scratchpad (New)
  plannerThinking: string // Streamed thought process of the planner

  // Handoff System (Multi-Agent V2)
  activeAgent?: string // Current agent in control
  previousAgent?: string // Agent who handed off
  handoffReason?: string // Why the handoff occurred

  // Task Tracking
  taskQueue: Task[] // Pending and active tasks
  completedTasks: CompletedTask[] // History of completed tasks

  // Skills System
  loadedSkills: string[] // IDs of currently loaded skills
  availableSkills: string[] // IDs of all available skills
}

/**
 * Task in the task queue
 */
export interface Task {
  id: string
  agent: string
  description: string
  status: 'pending' | 'active' | 'completed' | 'failed'
  context: Record<string, any>
  priority: 'high' | 'normal' | 'low'
  createdAt: number
  completedAt?: number
  estimatedComplexity?: 'simple' | 'moderate' | 'complex'
}

/**
 * Completed task with results
 */
export interface CompletedTask extends Task {
  status: 'completed'
  result: string
  nextAction?: string
  artifacts?: Record<string, any>
  completedAt: number
}

export interface PlanItem {
  id: string
  description: string
  assignedAgent: string // Using string to avoid circular dependency with AgentRole
  status: PlanStatus
  dependencies: string[]
  parallelGroupId?: string
  result?: string
}

// Default state factory
export function createInitialState(overrides?: Partial<WritersRoomState>): WritersRoomState {
  return {
    projectId: '',
    currentPhase: Phase.PREMISE,

    phaseIterations: 0,
    maxIterationsPerPhase: 15,
    seriesBible: {},
    masterPrompt: undefined,
    episodePrompt: undefined,
    episodePremise: undefined,
    characters: [],
    activeCast: [],
    beatBoard: [],
    unresolvedSetups: [],
    rejectedBeats: [],
    messages: [],
    awaitingUserInput: false,
    shouldTerminate: false,
    // Self-reflection defaults
    beatChallengeCount: 0,
    minConfidenceThreshold: 0.7,
    reflectionNotes: [],
    // Script evaluation defaults
    scriptRevisionCount: 0,
    scriptFeedback: [],
    // Deep Agent defaults
    plan: [],
    deepMemory: {},
    memory: {},
    plannerThinking: '',
    // Handoff System defaults
    activeAgent: undefined,
    previousAgent: undefined,
    handoffReason: undefined,
    taskQueue: [],
    completedTasks: [],
    loadedSkills: [],
    availableSkills: [],
    ...overrides,
  }
}
