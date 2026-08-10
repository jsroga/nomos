import { z } from 'zod'
import { ContentType, FetchCache, HttpMethod } from '@/shared/data/constants/protocol'
import { buildUrl } from '@/shared/data/url-builder'
import { WORLD_BUILDING_TOOLKIT_API_BASE_PATH } from '../../config/module'
import {
  assetListResponseSchema,
  createProjectRequestSchema,
  deleteProjectQuerySchema,
  deleteTileRequestSchema,
  listAssetsQuerySchema,
  listTilesQuerySchema,
  projectListResponseSchema,
  tileListResponseSchema,
  tileResponseSchema,
  upsertTileRequestSchema,
  type CreateProjectRequest,
  type DeleteTileRequest,
  type UpsertTileRequest,
  type WorldAsset,
  type WorldProject,
  type WorldTile,
  worldProjectSchema,
} from './world.dto'

const apiErrorSchema = z.object({ error: z.string() })

async function parseResponse<TSchema extends z.ZodTypeAny>(
  response: Response,
  schema: TSchema
): Promise<z.output<TSchema>> {
  const json = await response.json().catch(() => null)
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(json)
    throw new Error(parsed.success ? parsed.data.error : `Request failed (${response.status})`)
  }
  return schema.parse(json)
}

export const worldApi = {
  projects: {
    async list(): Promise<WorldProject[]> {
      const response = await fetch(buildUrl(`${WORLD_BUILDING_TOOLKIT_API_BASE_PATH}/projects`), {
        cache: FetchCache.NoStore,
      })
      return parseResponse(response, projectListResponseSchema)
    },
    async create(input: CreateProjectRequest): Promise<WorldProject> {
      const body = createProjectRequestSchema.parse(input)
      const response = await fetch(`${WORLD_BUILDING_TOOLKIT_API_BASE_PATH}/projects`, {
        method: HttpMethod.Post,
        headers: { 'Content-Type': ContentType.Json },
        body: JSON.stringify(body),
      })
      return parseResponse(response, worldProjectSchema)
    },
    async delete(projectId: string): Promise<void> {
      deleteProjectQuerySchema.parse({ projectId })
      const response = await fetch(
        buildUrl(`${WORLD_BUILDING_TOOLKIT_API_BASE_PATH}/projects`, { projectId }),
        { method: HttpMethod.Delete }
      )
      await parseResponse(response, z.object({ success: z.literal(true) }))
    },
  },
  tiles: {
    async list(projectId: string): Promise<WorldTile[]> {
      listTilesQuerySchema.parse({ projectId })
      const response = await fetch(
        buildUrl(`${WORLD_BUILDING_TOOLKIT_API_BASE_PATH}/tiles`, { projectId }),
        { cache: FetchCache.NoStore }
      )
      return parseResponse(response, tileListResponseSchema)
    },
    async upsert(input: UpsertTileRequest): Promise<WorldTile> {
      const body = upsertTileRequestSchema.parse(input)
      const response = await fetch(`${WORLD_BUILDING_TOOLKIT_API_BASE_PATH}/tiles`, {
        method: HttpMethod.Post,
        headers: { 'Content-Type': ContentType.Json },
        body: JSON.stringify(body),
      })
      return parseResponse(response, tileResponseSchema)
    },
    async remove(input: DeleteTileRequest): Promise<void> {
      const body = deleteTileRequestSchema.parse(input)
      const response = await fetch(`${WORLD_BUILDING_TOOLKIT_API_BASE_PATH}/tiles`, {
        method: HttpMethod.Delete,
        headers: { 'Content-Type': ContentType.Json },
        body: JSON.stringify(body),
      })
      await parseResponse(response, z.object({ success: z.literal(true) }))
    },
  },
  assets: {
    async list(projectId: string): Promise<WorldAsset[]> {
      listAssetsQuerySchema.parse({ projectId })
      const response = await fetch(
        buildUrl(`${WORLD_BUILDING_TOOLKIT_API_BASE_PATH}/assets`, { projectId }),
        { cache: FetchCache.NoStore }
      )
      return parseResponse(response, assetListResponseSchema)
    },
  },
}
