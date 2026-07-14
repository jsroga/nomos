import type { EntityType } from '@/domains/storyteller/core/entities/constants/reference-parser'

export enum StoryEntityType {
  Character = 'character',
  Place = 'place',
  Event = 'event',
  Faction = 'faction',
  Rule = 'rule',
  Beat = 'beat',
  Episode = 'episode',
  Item = 'item',
}

export const STORY_ENTITY_TYPES: EntityType[] = [
  StoryEntityType.Character,
  StoryEntityType.Place,
  StoryEntityType.Event,
  StoryEntityType.Faction,
  StoryEntityType.Rule,
  StoryEntityType.Beat,
  StoryEntityType.Episode,
  StoryEntityType.Item,
]
