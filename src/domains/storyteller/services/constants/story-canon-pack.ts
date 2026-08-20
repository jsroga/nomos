import { ContextAssemblyFallback } from '@/domains/storyteller/services/constants/context-assembly'

export const StoryCanonPackLimit = {
  BibleChars: 6000,
  VisualLockChars: 500,
  EpisodeLockChars: 800,
  PosterChars: 900,
  CastDescriptionChars: 240,
  CastCount: 24,
  EpisodeIndexCount: 24,
} as const

export enum StoryCanonPsychologyField {
  ActualMotivation = 'actualMotivation',
}

export enum StoryCanonPackLabel {
  Bible = 'SERIES BIBLE',
  SeasonRoadmap = 'SEASON ROADMAP',
  EpisodeIndex = 'EPISODE INDEX',
  Cast = 'OTHER CAST',
  Slot = 'ROADMAP SLOT',
  Premise = 'EPISODE PREMISE',
  Genre = 'Genre',
  Tone = 'Tone',
  World = 'World',
  None = '(none)',
  Logline = 'logline',
  ProtagonistHook = 'hook',
  Theme = 'theme',
}

export enum StoryCanonPackJoin {
  Block = '\n\n',
  Line = '\n',
  Sentence = '. ',
  CastField = ': ',
  MotivationPrefix = 'Motivation: ',
}

export enum StoryCanonPackJson {
  EmptyObject = '{}',
}

export const STORY_CANON_NOT_SET = ContextAssemblyFallback.NotSet
