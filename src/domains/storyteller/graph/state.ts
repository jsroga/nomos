import { BaseMessage } from '@langchain/core/messages'
import { EpisodePremise } from '../schemas/agent-schemas'

export interface BeatCard {
  id: string
  episodeId: string
  sequence: number
  logline: string
  content?: string
  beatType: 'setup' | 'complication' | 'revelation' | 'decision' | 'consequence'
  charactersInvolved: string[]
  emotionalShifts: Record<string, { from: string; to: string }>
  visualHook: string
  causalDependencies: string[]
  setupsPayoffs: { setupId?: string; payoffFor?: string }
  status: 'proposed' | 'challenged' | 'approved' | 'locked'
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

export type Phase = 'premise' | 'breaking' | 'cardlock' | 'writing' | 'complete'

export interface WritersRoomState {
  // Project Context
  projectId: string
  episodeId?: string

  // Phase Management
  currentPhase: Phase
  phaseIterations: number // Iterations within current phase
  maxIterationsPerPhase: number

  // Content
  seriesBible: Record<string, any>
  episodePremise?: EpisodePremise
  characters: CharacterState[]
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
  lastDevilVerdict?: 'PASS' | 'CHALLENGE' // Devil's advocate verdict
  reflectionNotes?: string[] // Notes from reflection process
  minConfidenceThreshold: number // Minimum confidence to accept (0-1)
  lastAgentConfidence?: number // Last agent's confidence score

  // Script evaluation (Evaluator-Optimizer loop)
  lastScriptVerdict?: 'PASS' | 'REVISE' // Script editor verdict
  scriptRevisionCount: number // How many times script was revised
  scriptFeedback?: string[] // Feedback from script editor for revision

  // Deep Agent State (Meta-Cognition)
  plan: PlanItem[] // Structured list of tasks
  deepMemory: Record<string, any> // Persistent cross-agent context
  plannerThinking: string // Streamed thought process of the planner
}

export interface PlanItem {
  id: string
  description: string
  assignedAgent: string // Using string to avoid circular dependency with AgentRole
  status: 'pending' | 'in_progress' | 'complete' | 'failed'
  dependencies: string[]
  parallelGroupId?: string
  result?: string
}

// Default state factory
export function createInitialState(overrides?: Partial<WritersRoomState>): WritersRoomState {
  return {
    projectId: '',
    currentPhase: 'premise',
    phaseIterations: 0,
    maxIterationsPerPhase: 15,
    seriesBible: {},
    episodePremise: undefined,
    characters: [],
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
    plannerThinking: '',
    ...overrides,
  }
}
