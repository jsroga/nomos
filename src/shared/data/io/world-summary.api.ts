import { fetchJson } from '@/shared/data/fetch-json-record'
import { recordFromJson } from '@/shared/data/json-guards'
import { QueryParam } from '@/shared/data/constants/protocol'
import { buildUrl } from '@/shared/data/url-builder'

/**
 * Cross-domain client for storyteller world-summary (used by world-building toolkit).
 * Lives in shared so domains do not import each other.
 */
export async function fetchWorldGenSummary(projectId: string): Promise<Record<string, unknown>> {
  return recordFromJson(
    await fetchJson(buildUrl('/api/storyteller/world-summary', { [QueryParam.ProjectId]: projectId }))
  )
}
