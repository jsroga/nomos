import { FetchCache } from '@/shared/data/constants/protocol'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { joinUrlPath } from '@/shared/data/url-builder'
import type { WorkspaceProject } from '../types'
import { toWorkspaceProject, workspaceProjectResponseSchema } from './workspace-project-schema'

export const WORKSPACE_PROJECT_API_PATH = '/api/storyteller/projects'

enum ProjectSessionFetchHeader {
  CacheControl = 'Cache-Control',
}

enum ProjectSessionCacheControl {
  NoCache = 'no-cache',
}

export async function fetchWorkspaceProject(projectId: string): Promise<WorkspaceProject> {
  const data = await fetchJsonRecord(joinUrlPath(WORKSPACE_PROJECT_API_PATH, projectId), {
    cache: FetchCache.NoStore,
    headers: { [ProjectSessionFetchHeader.CacheControl]: ProjectSessionCacheControl.NoCache },
  })
  return toWorkspaceProject(workspaceProjectResponseSchema.parse(data))
}
