/** Game entity mention provider icons, labels, and API wire constants. */

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
  InteriorDesigner = '3d-canvas',
  WorldBuilding = '2d-canvas',
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

