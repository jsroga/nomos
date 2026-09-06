import type { PhaseId } from './enums'
import { BeatStatus } from './enums'
import {
  recordFromJson,
  readString,
  readNumber,
  stringArrayFromJson,
} from '@/shared/data/json-guards'

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
  mazurElements?: Record<string, unknown>
  charactersInvolved?: string[]
  content?: string
  status?: `${BeatStatus}`
  emotionalShifts?: Record<string, unknown>
  causalDependencies?: string[]
  setupsPayoffs?: Record<string, unknown>
}

const BEAT_CARD_STATUSES = [
  `${BeatStatus.PROPOSED}`,
  `${BeatStatus.CHALLENGED}`,
  `${BeatStatus.APPROVED}`,
  `${BeatStatus.REJECTED}`,
  `${BeatStatus.LOCKED}`,
] as const

/** Parse an untyped API/DB row into a BeatCard without `as` casts. */
export function beatCardFromJson(value: unknown): BeatCard {
  const row = recordFromJson(value)
  const status = readString(row.status)
  return {
    id: readString(row.id) ?? '',
    sequence: readNumber(row.sequence) ?? 0,
    logline: readString(row.logline) ?? '',
    beatType: readString(row.beatType) ?? '',
    visualHook: readString(row.visualHook),
    imagePrompt: readString(row.imagePrompt) ?? readString(row.image_prompt),
    imageUrl: readString(row.imageUrl) ?? readString(row.image_url),
    mazurElements: row.mazurElements === undefined ? undefined : recordFromJson(row.mazurElements),
    charactersInvolved:
      row.charactersInvolved === undefined ? undefined : stringArrayFromJson(row.charactersInvolved),
    content: readString(row.content),
    status: BEAT_CARD_STATUSES.find(s => s === status),
    emotionalShifts:
      row.emotionalShifts === undefined ? undefined : recordFromJson(row.emotionalShifts),
    causalDependencies:
      row.causalDependencies === undefined ? undefined : stringArrayFromJson(row.causalDependencies),
    setupsPayoffs: row.setupsPayoffs === undefined ? undefined : recordFromJson(row.setupsPayoffs),
  }
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
  metricsHistory?: Record<string, unknown>[]
  // New Psychologist props
  psychometrics?: Big5Traits
  needs?: CharacterNeeds
  relationships?: Record<string, RelationshipState>
}

export interface SeriesBible {
  worldRules?: Record<string, unknown>[]
  [key: string]: unknown
}

export interface WritersRoomState {
  episodeId?: string
  messages?: Array<{ role: string; content: string }>
  beatBoard: BeatCard[]
  currentBeat?: BeatCard
  rejectedBeats: BeatCard[]
  characters: CharacterState[]
  script?: string
  scriptVersion?: number
  seriesBible?: SeriesBible
  episodePremise?: Record<string, unknown>
  unresolvedSetups: Setup[]
  currentPhase: PhaseId
}
