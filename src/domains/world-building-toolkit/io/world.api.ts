import { z } from 'zod'
import { WORLD_BUILDING_TOOLKIT_API_BASE_PATH } from '../world-building-toolkit.config'
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

function buildUrl(path: string, query?: Record<string, string>): string {
  if (!query) return path
  const params = new URLSearchParams(query)
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

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
        cache: 'no-store',
      })
      return parseResponse(response, projectListResponseSchema)
    },
    async create(input: CreateProjectRequest): Promise<WorldProject> {
      const body = createProjectRequestSchema.parse(input)
      const response = await fetch(`${WORLD_BUILDING_TOOLKIT_API_BASE_PATH}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return parseResponse(response, worldProjectSchema)
    },
    async delete(projectId: string): Promise<void> {
      deleteProjectQuerySchema.parse({ projectId })
      const response = await fetch(
        buildUrl(`${WORLD_BUILDING_TOOLKIT_API_BASE_PATH}/projects`, { projectId }),
        { method: 'DELETE' }
      )
      await parseResponse(response, z.object({ success: z.literal(true) }))
    },
  },
  tiles: {
    async list(projectId: string): Promise<WorldTile[]> {
      listTilesQuerySchema.parse({ projectId })
      const response = await fetch(
        buildUrl(`${WORLD_BUILDING_TOOLKIT_API_BASE_PATH}/tiles`, { projectId }),
        { cache: 'no-store' }
      )
      return parseResponse(response, tileListResponseSchema)
    },
    async upsert(input: UpsertTileRequest): Promise<WorldTile> {
      const body = upsertTileRequestSchema.parse(input)
      const response = await fetch(`${WORLD_BUILDING_TOOLKIT_API_BASE_PATH}/tiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return parseResponse(response, tileResponseSchema)
    },
    async remove(input: DeleteTileRequest): Promise<void> {
      const body = deleteTileRequestSchema.parse(input)
      const response = await fetch(`${WORLD_BUILDING_TOOLKIT_API_BASE_PATH}/tiles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
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
        { cache: 'no-store' }
      )
      return parseResponse(response, assetListResponseSchema)
    },
  },
}
