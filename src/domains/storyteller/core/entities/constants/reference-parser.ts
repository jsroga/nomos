/** Reference parser wire values — entity prefixes and segment types. */

import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'

export type EntityType = `${StoryEntityType}`

export enum EntityRefPrefix {
  Character = 'char',
  Place = 'place',
  Event = 'event',
  Faction = 'faction',
  Rule = 'rule',
  Beat = 'beat',
  Episode = 'ep',
  Item = 'item',
}

export enum ReferenceSegmentType {
  Text = 'text',
  Reference = 'reference',
}

export const ENTITY_PREFIXES: Record<EntityType, EntityRefPrefix> = {
  [StoryEntityType.Character]: EntityRefPrefix.Character,
  [StoryEntityType.Place]: EntityRefPrefix.Place,
  [StoryEntityType.Event]: EntityRefPrefix.Event,
  [StoryEntityType.Faction]: EntityRefPrefix.Faction,
  [StoryEntityType.Rule]: EntityRefPrefix.Rule,
  [StoryEntityType.Beat]: EntityRefPrefix.Beat,
  [StoryEntityType.Episode]: EntityRefPrefix.Episode,
  [StoryEntityType.Item]: EntityRefPrefix.Item,
}

export const ENTITY_TYPES: EntityType[] = [
  StoryEntityType.Character,
  StoryEntityType.Place,
  StoryEntityType.Event,
  StoryEntityType.Faction,
  StoryEntityType.Rule,
  StoryEntityType.Beat,
  StoryEntityType.Episode,
  StoryEntityType.Item,
]

export const REFERENCE_DISPLAY_CAPTURE = '$1'

export const PREFIX_TO_TYPE: Record<string, EntityType> = Object.create(null)
for (const type of ENTITY_TYPES) {
  PREFIX_TO_TYPE[ENTITY_PREFIXES[type]] = type
}
