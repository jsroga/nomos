import { useQueries } from '@tanstack/react-query'
import type { EntityReference } from '@/domains/storyteller/core/entities/entity-references'
import { entityLoader } from '@/domains/storyteller/services/entity-loader-service'
import { storytellerKeys } from '@/domains/storyteller/core/io/storyteller.keys'
import { entityNeedsDescription } from '@/domains/storyteller/services/constants/entity-needs-description'

const ENTITY_QUERY_STALE_MS = 1000 * 60 * 5

function entityQueryStaleMs(data: EntityReference | null | undefined): number {
  if (!data) return 0
  return entityNeedsDescription(data.description, data.name) ? 0 : ENTITY_QUERY_STALE_MS
}

export function useEntities(ids: string[], projectId: string | null | undefined, context?: string) {
  return useQueries({
    queries: ids.map(id => ({
      queryKey: storytellerKeys.entity(projectId, id, context),
      queryFn: () => {
        if (!id || !projectId) return null
        return entityLoader.load(id, projectId, context)
      },
      enabled: !!id && !!projectId,
      staleTime: (query: { state: { data: EntityReference | null | undefined } }) =>
        entityQueryStaleMs(query.state.data),
    })),
  })
}
