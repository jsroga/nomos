import { EntityType, SourceDomain } from '@/shared/data/queries/useGameEntities'
import { DomAbortErrorName } from '@/shared/data/constants/game-entities-wire'
import {
  GAME_SOURCE_DOMAIN_LABELS,
  GameEntityIconName,
  GameEntityTypeId,
  GameSourceDomainId,
} from '../constants/game-entity-mentions'

export {
  EntityApiQueryParam,
  GAME_ENTITY_FETCH_ERROR,
  GAME_ENTITY_LOG_PREFIX,
  GAME_ENTITY_TYPE_ICONS,
  GAME_SOURCE_DOMAIN_LABELS,
  GameEntityIconName,
  GameEntityTypeId,
  GameSourceDomainId,
} from '../constants/game-entity-mentions'

export function isIgnorableGameEntityFetchError(error: unknown): boolean {
  if (error instanceof TypeError) return true
  return error instanceof Error && error.name === DomAbortErrorName.AbortError
}

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
