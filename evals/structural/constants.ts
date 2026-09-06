export enum ScorerId {
  CausalGraph = 'causal_graph_integrity',
  PlanCoverage = 'plan_coverage_evenness',
  SetupPayoff = 'setup_payoff_distance',
  CanonViolation = 'canon_violation',
  CharacterField = 'character_field_adherence',
  SchemaValidity = 'schema_validity',
  SlopRate = 'slop_rate',
  SelfRepetition = 'self_repetition',
  VoiceDistinctiveness = 'voice_distinctiveness',
  DialogueAdjacency = 'dialogue_adjacency',
}

export enum EntityKind {
  Place = 'place',
  Institution = 'institution',
  Law = 'law',
  Ritual = 'ritual',
  Object = 'object',
  Event = 'event',
  Character = 'character',
}

export enum CanonBucket {
  UnknownEntity = 'unknown_entity',
  NewCharacter = 'new_character',
}

export enum ClimaxBeatType {
  Climax = 'climax',
  Resolution = 'resolution',
}

export enum CharacterFieldName {
  Wants = 'wants',
  Fears = 'fears',
  WontBreak = 'wontBreak',
}

export const GRID_FILLING_VARIANCE_MAX = 0.05
export const FINAL_FIFTH = 0.8
export const FINAL_THIRD = 2 / 3
export const TOKENS_PER_THOUSAND = 1000
export const DISTINCT_N_VALUES = [3, 4] as const
export const BEAT_ONE = 1
export const PACKED_ACTION_TAKEN = 'actionTaken'
export const PACKED_CONSEQUENCE = 'consequence'
export const PACKED_STORY_STATE_CHANGE = 'storyStateChange'
