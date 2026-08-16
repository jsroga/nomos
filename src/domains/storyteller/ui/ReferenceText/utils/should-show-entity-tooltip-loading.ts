import type { EntityReference } from '@/domains/storyteller/core/entities/entity-references'
import { entityNeedsDescription } from '@/domains/storyteller/services/constants/entity-needs-description'

export function shouldRefetchEntityForTooltip(
  entity: EntityReference | null | undefined
): boolean {
  if (!entity) return true
  return entityNeedsDescription(entity.description, entity.name)
}

export function shouldShowEntityTooltipLoading(
  isPending: boolean,
  isFetching: boolean,
  entity: EntityReference | null | undefined
): boolean {
  if (isPending && isFetching) return true
  if (!isFetching) return false
  return shouldRefetchEntityForTooltip(entity)
}
