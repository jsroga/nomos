import { z } from 'zod'
import { ContentType, FetchCache, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { fetchJson } from '@/shared/data/fetch-json-record'
import { buildUrl } from '@/shared/data/url-builder'
import { WORKSPACE_PROJECTS_CRUD_API_PATH } from '../constants/workspace-projects'
import type { WorkspaceProject } from '../types'
import { toWorkspaceProject, workspaceProjectResponseSchema } from './workspace-project-schema'

enum ProjectsApiHeader {
  ContentType = 'Content-Type',
}

const deleteProjectResponseSchema = z.object({ success: z.literal(true) })

const createProjectRequestSchema = z.object({
  name: z.string().min(1),
  masterPrompt: z.string().optional().default(''),
})

export async function fetchWorkspaceProjects(): Promise<WorkspaceProject[]> {
  const data = await fetchJson(WORKSPACE_PROJECTS_CRUD_API_PATH, {
    cache: FetchCache.NoStore,
  })
  return z.array(workspaceProjectResponseSchema).parse(data).map(toWorkspaceProject)
}

export async function createWorkspaceProject(input: {
  name: string
  masterPrompt?: string
}): Promise<WorkspaceProject> {
  const body = createProjectRequestSchema.parse(input)
  const data = await fetchJson(WORKSPACE_PROJECTS_CRUD_API_PATH, {
    method: HttpMethod.Post,
    headers: { [ProjectsApiHeader.ContentType]: ContentType.Json },
    body: JSON.stringify(body),
  })
  return toWorkspaceProject(workspaceProjectResponseSchema.parse(data))
}

export async function deleteWorkspaceProject(projectId: string): Promise<void> {
  const data = await fetchJson(
    buildUrl(WORKSPACE_PROJECTS_CRUD_API_PATH, { [QueryParam.ProjectId]: projectId }),
    { method: HttpMethod.Delete }
  )
  deleteProjectResponseSchema.parse(data)
}
