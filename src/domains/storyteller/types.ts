export enum Phase {
  BRAINSTORMING = 'brainstorming',
  PLANNING = 'planning',
  WRITING = 'writing',
  REVIEW = 'review',
}

export interface Setup {
  id: string
  description: string
  beatId: string
  isResolved: boolean
  payoffBeatId?: string
}

export interface BeatCard {
  id: string
  sequence: number
  logline: string
  beatType: string
  visualHook?: string
  imagePrompt?: string
  imageUrl?: string
  mazurElements?: any
  charactersInvolved?: string[]
  content?: string
  status?: 'proposed' | 'approved' | 'rejected'
  emotionalShifts?: Record<string, unknown>
  causalDependencies?: string[]
  setupsPayoffs?: Record<string, unknown>
}

export interface CharacterMetrics {
  valence: number
  arousal: number
  autonomy: number
  competence: number
  relatedness: number
  cognitiveClarity: number
  perceivedStakes: number
  socialSafety: number
  moralAlignment: number
  transformation: number
}

export interface Big5Traits {
  openness: number // 0-1
  conscientiousness: number // 0-1
  extraversion: number // 0-1
  agreeableness: number // 0-1
  neuroticism: number // 0-1
}

export interface CharacterNeeds {
  primary: string
  secondary: string
  deficiency: string // What they lack to be happy (The "Hole in the Soul")
  falseBelief: string // The lie they tell themselves
}

export interface RelationshipState {
  characterId: string
  targetId: string
  trust: number // 0-100
  respect: number // 0-100
  attraction: number // 0-100
  conflict: number // 0-100
  history: string[] // Last 3 interactions
}

export interface CharacterState {
  characterId?: string
  id?: string // legacy support
  name: string
  role?: string
  archetype?: string
  currentGoals?: string[]
  fears?: string[]
  selfDelusion?: string
  actualMotivation?: string
  knowledgeState?: string[]
  metrics?: CharacterMetrics
  metricsHistory?: any[]
  // New Psychologist props
  psychometrics?: Big5Traits
  needs?: CharacterNeeds
  relationships?: Record<string, RelationshipState>
}

export interface SeriesBible {
  worldRules?: any[]
  [key: string]: any
}

export interface WritersRoomState {
  episodeId?: string
  beatBoard: BeatCard[]
  currentBeat?: BeatCard
  rejectedBeats: BeatCard[]
  characters: CharacterState[]
  script?: string
  scriptVersion?: number
  seriesBible?: SeriesBible
  episodePremise?: any
  unresolvedSetups: Setup[]
  currentPhase: Phase
}
