/** Entity auto-linker wire values. */

import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'

export { StoryEntityType as AutoLinkerEntityType }

export enum EntityAutoLinkerArticlePrefix {
  The = 'The ',
  TheCapital = 'The',
}

/** Prefixes for the synthetic entity ids the auto-linker generates. */
export enum EntityAutoLinkerIdPrefix {
  Faction = 'faction',
  Character = 'char',
  Rule = 'rule',
  Item = 'item',
  Event = 'event',
  Place = 'place',
}

export enum EntityAutoLinkerStopWord {
  A = 'A',
  An = 'An',
  In = 'In',
  On = 'On',
  At = 'At',
}

export enum EntityAutoLinkerRegexFlag {
  GlobalCaseInsensitive = 'gi',
}

export enum EntityAutoLinkerRegexReplacement {
  EscapedMatch = '\\$&',
}

export enum EntityAutoLinkerLog {
  FailedAutoLink = '[AutoLinker] Failed to auto-link entities:',
}
