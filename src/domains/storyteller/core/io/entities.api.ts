import { HttpMethod, QueryParam, BooleanQueryValue } from '@/shared/data/constants/protocol'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { buildUrl } from '@/shared/data/url-builder'

const MARK_REFERENCED_ROUTE = '/api/entities/mark-referenced'
const RESOLVE_ROUTE = '/api/entities/resolve'

export async function markEntityReferenced(projectId: string, entityId: string): Promise<void> {
  await fetchJsonRecord(
    buildUrl(MARK_REFERENCED_ROUTE, { [QueryParam.ProjectId]: projectId, [QueryParam.Id]: entityId }),
    { method: HttpMethod.Post }
  )
}

export async function resolveEntities(input: {
  projectId: string
  ids: string[]
  enrichRelationships?: boolean
  context?: string
}): Promise<Record<string, unknown>> {
  return fetchJsonRecord(
    buildUrl(RESOLVE_ROUTE, {
      [QueryParam.ProjectId]: input.projectId,
      [QueryParam.Ids]: input.ids.join(','),
      ...(input.enrichRelationships
        ? { [QueryParam.EnrichRelationships]: BooleanQueryValue.True }
        : {}),
      ...(input.context ? { [QueryParam.Context]: input.context } : {}),
    })
  )
}
