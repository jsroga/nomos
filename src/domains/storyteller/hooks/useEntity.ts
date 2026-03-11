import { useQueries } from '@tanstack/react-query'
import { entityLoader } from '../lib/entity-loader'

export function useEntities(ids: string[], projectId: string | null | undefined, context?: string) {
  return useQueries({
    queries: ids.map(id => ({
      queryKey: ['entity', projectId, id, context],
      queryFn: () => {
        if (!id || !projectId) return null
        return entityLoader.load(id, projectId, context)
      },
      enabled: !!id && !!projectId,
      staleTime: 1000 * 60 * 5,
    })),
  })
}
