import type { CanonBucket, CharacterFieldName, EntityKind, ScorerId } from './constants'

export interface MatchingRules {
  caseInsensitive: boolean
  ignoreLeadingThe: boolean
  singularPlural: boolean
  explicitAliases: boolean
  wholePhraseWordBoundaries: boolean
}

export interface LexiconEntry {
  term: string
  aliases: string[]
  kind: EntityKind
}

export interface CastPerson {
  name: string
  aliases: string[]
  psychology: Record<string, unknown>
}

export interface DumpedBeat {
  id: string
  episodeId: string
  sequence: number
  logline: string
  beatType: string
  content: string
  visualHook: string
  charactersInvolved: string[]
  emotionalShifts: unknown
  causalDependencies: string[]
  setupsPayoffs: Record<string, unknown>
  actionTaken: string
  consequence: string
  storyStateChange: string
  status: string
  imageUrl: string | null
  imagePrompt: string | null
}

export interface PhraseHit {
  start: number
  end: number
  matchedString: string
  term: string
  kind: EntityKind
}

export interface CanonFlag {
  sequence: number
  matchedString: string
  bucket: CanonBucket
}

export interface StructuralScore {
  id: ScorerId
  metrics: Record<string, number | boolean | null>
  flags: ReadonlyArray<Record<string, unknown>>
}

export interface CharacterFieldFinding {
  character: string
  field: CharacterFieldName
  sequence: number
  hardFail: boolean
  evidence: string
}
