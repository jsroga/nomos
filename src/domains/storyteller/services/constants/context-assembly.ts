import { BibleCategoryKey } from '@/shared/data/constants/protocol'

export enum ContextAssemblyLog {
  SourcesLoadedIn = '[Stream] Context sources loaded in ',
  TokenBudgetTrimmed = '[Stream] Token budget trimmed sections:',
  FailedToLoadContext = 'Failed to load context for stream:',
}

export enum ContextAssemblyFallback {
  NotSet = 'Not set',
  NoEpisodePremise = 'No episode premise yet',
  NoWorldDescription = 'No world description yet',
  NoDescription = 'No description',
  None = '(none)',
  NoneLabel = 'None',
  RuleLabel = 'Rule',
}

export enum ContextPremiseExtraField {
  Title = 'title',
  ThematicQuestion = 'thematicQuestion',
  AntagonistMove = 'antagonistMove',
}

export const BIBLE_CATEGORY_KEYS: readonly BibleCategoryKey[] = [
  BibleCategoryKey.General,
  BibleCategoryKey.Setting,
  BibleCategoryKey.History,
  BibleCategoryKey.Magic,
  BibleCategoryKey.Factions,
  BibleCategoryKey.Technology,
  BibleCategoryKey.Culture,
]
