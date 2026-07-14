/** Entity auto-linker wire values. */

import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'

export { StoryEntityType as AutoLinkerEntityType }

export enum EntityAutoLinkerArticlePrefix {
  The = 'The ',
  TheCapital = 'The',
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
