import { z } from 'zod'
import { ContentType, FetchCache, HttpMethod, QueryParam, UrlScheme } from '@/shared/data/constants/protocol'
import { buildUrl } from '@/shared/data/url-builder';

export const WORKSPACE_ASSETS_API_PATH = '/api/world/assets'

const dateLikeSchema = z.union([z.string(), z.date()]).transform(value => {
  if (value instanceof Date) return value.toISOString()
  return value
})

export const workspaceAssetSchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().uuid().optional(),
    project_id: z.string().uuid().optional(),
    imageFilename: z.string(),
    image_filename: z.string().optional(),
    modelFilename: z.string().nullable().optional(),
    model_filename: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).optional().default({}),
    createdAt: dateLikeSchema.optional(),
    created_at: dateLikeSchema.optional(),
  })
  .passthrough()
  .transform(row => ({
    id: row.id,
    projectId: row.projectId ?? row.project_id ?? '',
    imageFilename: row.imageFilename ?? row.image_filename ?? '',
    modelFilename: row.modelFilename ?? row.model_filename ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.createdAt ?? row.created_at,
  }))

export const workspaceAssetListSchema = z.array(workspaceAssetSchema)

export type WorkspaceAsset = z.infer<typeof workspaceAssetSchema>

export async function listProjectAssets(projectId: string): Promise<WorkspaceAsset[]> {
  const response = await fetch(buildUrl(WORKSPACE_ASSETS_API_PATH, { [QueryParam.ProjectId]: projectId }), {
    cache: FetchCache.NoStore,
  })
  const json: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error('Failed to fetch project assets')
  }
  return workspaceAssetListSchema.parse(json)
}

export function resolveProjectAssetUrl(
  projectId: string,
  filename: string
): string {
  if (filename.startsWith(UrlScheme.Http) || filename.startsWith(UrlScheme.Https)) {
    return filename
  }
  return `/projects/${projectId}/assets/${filename}`
}

export { HttpMethod, ContentType }
