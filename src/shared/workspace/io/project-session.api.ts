import { ContentType, FetchCache, HttpMethod } from '@/shared/data/constants/protocol'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { joinUrlPath } from '@/shared/data/url-builder'
import { isValidProjectId } from '@/shared/auth/security'
import { DB_COLUMN } from '@/shared/data/constants/db-tables'
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
  if (!isValidProjectId(projectId)) {
    throw new Error(`Invalid project id: ${projectId}`)
  }
  const data = await fetchJsonRecord(joinUrlPath(WORKSPACE_PROJECT_API_PATH, projectId), {
    cache: FetchCache.NoStore,
    headers: { [ProjectSessionFetchHeader.CacheControl]: ProjectSessionCacheControl.NoCache },
  })
  return toWorkspaceProject(workspaceProjectResponseSchema.parse(data))
}

enum ProjectSessionPatchHeader {
  ContentType = 'Content-Type',
}

export async function renameWorkspaceProject(projectId: string, name: string): Promise<void> {
  if (!isValidProjectId(projectId)) {
    throw new Error(`Invalid project id: ${projectId}`)
  }
  await fetchJsonRecord(joinUrlPath(WORKSPACE_PROJECT_API_PATH, projectId), {
    method: HttpMethod.Patch,
    headers: { [ProjectSessionPatchHeader.ContentType]: ContentType.Json },
    body: JSON.stringify({ [DB_COLUMN.NAME]: name }),
  })
}
