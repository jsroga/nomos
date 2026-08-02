/** Game entity mention provider icons, labels, and API wire constants. */

import { EntityType, SourceDomain } from '@/shared/data/queries/useGameEntities'

export enum GameEntityTypeId {
  Character = 'character',
  Location = 'location',
  Mechanic = 'mechanic',
  Faction = 'faction',
  Item = 'item',
  Quest = 'quest',
}

export enum GameEntityIconName {
  Character = 'User',
  Location = 'MapPin',
  Mechanic = 'Cog',
  Faction = 'Users',
  Item = 'Package',
  Quest = 'Target',
  Fallback = 'Database',
}

export const GAME_ENTITY_TYPE_ICONS: Record<GameEntityTypeId, GameEntityIconName> = {
  [GameEntityTypeId.Character]: GameEntityIconName.Character,
  [GameEntityTypeId.Location]: GameEntityIconName.Location,
  [GameEntityTypeId.Mechanic]: GameEntityIconName.Mechanic,
  [GameEntityTypeId.Faction]: GameEntityIconName.Faction,
  [GameEntityTypeId.Item]: GameEntityIconName.Item,
  [GameEntityTypeId.Quest]: GameEntityIconName.Quest,
}

export enum GameSourceDomainId {
  Storyteller = 'storyteller',
  LoopCreator = 'loop-creator',
  InteriorDesigner = 'interior-designer',
  WorldBuilding = 'world-building',
}

export const GAME_SOURCE_DOMAIN_LABELS: Record<GameSourceDomainId, string> = {
  [GameSourceDomainId.Storyteller]: 'Storyteller',
  [GameSourceDomainId.LoopCreator]: 'Loop Creator',
  [GameSourceDomainId.WorldBuilding]: 'Infinite Canvas',
  [GameSourceDomainId.InteriorDesigner]: '3D Canvas',
}

export enum EntityApiQueryParam {
  Search = 'search',
}

export const GAME_ENTITY_FETCH_ERROR = 'Failed to fetch entities'
export const GAME_ENTITY_LOG_PREFIX = '[GameEntityProvider] Fetch error:'

export function iconForEntityType(entityType: EntityType): GameEntityIconName {
  switch (entityType) {
    case GameEntityTypeId.Character:
      return GameEntityIconName.Character
    case GameEntityTypeId.Location:
      return GameEntityIconName.Location
    case GameEntityTypeId.Mechanic:
      return GameEntityIconName.Mechanic
    case GameEntityTypeId.Faction:
      return GameEntityIconName.Faction
    case GameEntityTypeId.Item:
      return GameEntityIconName.Item
    case GameEntityTypeId.Quest:
      return GameEntityIconName.Quest
    default:
      return GameEntityIconName.Fallback
  }
}

export function labelForSourceDomain(sourceDomain: SourceDomain): string {
  switch (sourceDomain) {
    case GameSourceDomainId.Storyteller:
      return GAME_SOURCE_DOMAIN_LABELS[GameSourceDomainId.Storyteller]
    case GameSourceDomainId.LoopCreator:
      return GAME_SOURCE_DOMAIN_LABELS[GameSourceDomainId.LoopCreator]
    case GameSourceDomainId.InteriorDesigner:
      return GAME_SOURCE_DOMAIN_LABELS[GameSourceDomainId.InteriorDesigner]
    case GameSourceDomainId.WorldBuilding:
      return GAME_SOURCE_DOMAIN_LABELS[GameSourceDomainId.WorldBuilding]
    default:
      return sourceDomain
  }
}
