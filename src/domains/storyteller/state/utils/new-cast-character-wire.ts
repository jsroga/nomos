/** Wire values for detecting newly generated cast members in committed content. */

import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'

export enum NewCastField {
  CharactersInvolved = 'charactersInvolved',
  Logline = 'logline',
  Name = 'name',
  Role = 'role',
  Description = 'description',
}

export const NEW_CAST_ENTITY_TYPE = StoryEntityType.Character

/** Descriptions are lifted verbatim from generated prose — cap them for the cast card. */
export const NEW_CAST_DESCRIPTION_MAX_LENGTH = 240

export const NEW_CAST_SENTENCE_SPLIT = /(?<=[.!?])\s+/

export const NEW_CAST_ACTION_ID_PREFIX = 'add-to-cast'
