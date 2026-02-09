import { useQuery } from '@tanstack/react-query'
import { entityLoader } from '../lib/entity-loader'

/**
 * useEntity
 *
 * Fetches an entity by ID using React Query and the EntityLoader.
 * - Handles caching, deduping, and stale time via React Query.
 * - Handles batching multiple requests via EntityLoader.
 */
function useEntity(
  id: string | null | undefined,
  projectId: string | null | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['entity', projectId, id],
    queryFn: () => {
      if (!id || !projectId) return null
      return entityLoader.load(id, projectId)
    },
    enabled: enabled && !!id && !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * useEntities
 *
 * Fetches multiple entities with parallel queries.
 * Note: React Query's `useQueries` would be better here for parallel execution,
 * but for simplicity and batching support, we can just rely on individual hooks
 * or a wrapper. However, usually we might resolving a list of IDs.
 *
 * For ReferenceText, we have a list of IDs. Mapping them to `useQueries` is best.
 */
import { useQueries } from '@tanstack/react-query'

export function useEntities(ids: string[], projectId: string | null | undefined) {
  return useQueries({
    queries: ids.map(id => ({
      queryKey: ['entity', projectId, id],
      queryFn: () => {
        if (!id || !projectId) return null
        return entityLoader.load(id, projectId)
      },
      enabled: !!id && !!projectId,
      staleTime: 1000 * 60 * 5,
    })),
  })
}
