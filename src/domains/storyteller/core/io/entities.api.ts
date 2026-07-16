import { HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { buildUrl } from '@/shared/data/url-builder'
import { recordFromJson } from '@/shared/data/json-guards'

const MARK_REFERENCED_ROUTE = '/api/entities/mark-referenced'
const RESOLVE_ROUTE = '/api/entities/resolve'

export async function markEntityReferenced(projectId: string, entityId: string): Promise<void> {
  await fetch(buildUrl(MARK_REFERENCED_ROUTE, { [QueryParam.ProjectId]: projectId, [QueryParam.Id]: entityId }), {
    method: HttpMethod.Post,
  })
}

export async function resolveEntities(input: {
  projectId: string
  ids: string[]
  enrichRelationships?: boolean
  context?: string
}): Promise<Record<string, unknown>> {
  const response = await fetch(
    buildUrl(RESOLVE_ROUTE, {
      [QueryParam.ProjectId]: input.projectId,
      [QueryParam.Ids]: input.ids.join(','),
      ...(input.enrichRelationships ? { [QueryParam.EnrichRelationships]: 'true' } : {}),
      ...(input.context ? { [QueryParam.Context]: input.context } : {}),
    })
  )

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  const json: unknown = await response.json()
  return recordFromJson(json)
}
