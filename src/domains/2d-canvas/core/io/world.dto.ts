import { z } from 'zod'
import { WorldDtoError } from './constants/world-dto-errors'

function coalesceSnakeCaseField(
  camel: string | undefined,
  snake: string | undefined,
): string {
  const value = camel ?? snake
  if (value === undefined) {
    throw new Error(WorldDtoError.RequiredSnakeCaseFieldMissing)
  }
  return value
}

const dateLikeSchema = z.union([z.string(), z.date()]).transform(value => {
  if (value instanceof Date) return value.toISOString()
  return value
})

export const worldProjectSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid().optional(),
    user_id: z.string().uuid().optional(),
    name: z.string(),
    masterPrompt: z.string().nullable().optional(),
    master_prompt: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    seriesBible: z.record(z.unknown()).nullable().optional(),
    series_bible: z.record(z.unknown()).nullable().optional(),
    storyPlan: z.record(z.unknown()).nullable().optional(),
    story_plan: z.record(z.unknown()).nullable().optional(),
    stylePreset: z.string().nullable().optional(),
    style_preset: z.string().nullable().optional(),
    generationMode: z.string().nullable().optional(),
    generation_mode: z.string().nullable().optional(),
    canvasMasterPrompt: z.string().nullable().optional(),
    canvas_master_prompt: z.string().nullable().optional(),
    styleAnchorUrl: z.string().nullable().optional(),
    style_anchor_url: z.string().nullable().optional(),
    createdAt: dateLikeSchema.optional(),
    created_at: dateLikeSchema.optional(),
  })
  .passthrough()
  .transform(row => ({
    id: row.id,
    userId: row.userId ?? row.user_id,
    name: row.name,
    masterPrompt: row.masterPrompt ?? row.master_prompt ?? '',
    description: row.description ?? null,
    seriesBible: row.seriesBible ?? row.series_bible ?? {},
    storyPlan: row.storyPlan ?? row.story_plan ?? {},
    stylePreset: row.stylePreset ?? row.style_preset ?? null,
    generationMode: row.generationMode ?? row.generation_mode ?? null,
    canvasMasterPrompt: row.canvasMasterPrompt ?? row.canvas_master_prompt ?? '',
    styleAnchorUrl: row.styleAnchorUrl ?? row.style_anchor_url ?? null,
    createdAt: row.createdAt ?? row.created_at,
  }))

export const worldTileSchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().uuid().optional(),
    project_id: z.string().uuid().optional(),
    x: z.number().int(),
    y: z.number().int(),
    tilePrompt: z.string().nullable().optional(),
    tile_prompt: z.string().nullable().optional(),
    imageFilename: z.string().nullable().optional(),
    image_filename: z.string().nullable().optional(),
    createdAt: dateLikeSchema.optional(),
    created_at: dateLikeSchema.optional(),
  })
  .passthrough()
  .transform(row => ({
    id: row.id,
    projectId: coalesceSnakeCaseField(row.projectId, row.project_id),
    x: row.x,
    y: row.y,
    tilePrompt: row.tilePrompt ?? row.tile_prompt ?? null,
    imageFilename: row.imageFilename ?? row.image_filename ?? null,
    createdAt: row.createdAt ?? row.created_at,
  }))

export const selectBoxSchema = z.object({
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
})

export const worldAssetSchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().uuid().optional(),
    project_id: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    user_id: z.string().uuid().optional(),
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
    projectId: coalesceSnakeCaseField(row.projectId, row.project_id),
    userId: row.userId ?? row.user_id,
    imageFilename: coalesceSnakeCaseField(row.imageFilename, row.image_filename),
    modelFilename: row.modelFilename ?? row.model_filename ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.createdAt ?? row.created_at,
  }))

export const createProjectRequestSchema = z.object({
  name: z.string().min(1),
  masterPrompt: z.string().optional().default(''),
})

export const deleteProjectQuerySchema = z.object({
  projectId: z.string().uuid(),
})

export const listTilesQuerySchema = z.object({
  projectId: z.string().uuid(),
})

export const upsertTileRequestSchema = z.object({
  projectId: z.string().uuid(),
  x: z.number().int(),
  y: z.number().int(),
  tilePrompt: z.string().optional().default(''),
  imageFilename: z.string().min(1),
})

export const deleteTileRequestSchema = z.object({
  projectId: z.string().uuid(),
  x: z.number().int(),
  y: z.number().int(),
})

export const listAssetsQuerySchema = z.object({
  projectId: z.string().uuid(),
})

export const projectListResponseSchema = z.array(worldProjectSchema)
export const tileListResponseSchema = z.array(worldTileSchema)
export const tileResponseSchema = worldTileSchema
export const assetListResponseSchema = z.array(worldAssetSchema)

export type WorldProject = z.infer<typeof worldProjectSchema>
export type WorldTile = z.infer<typeof worldTileSchema>
export type WorldAsset = z.infer<typeof worldAssetSchema>
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>
export type UpsertTileRequest = z.infer<typeof upsertTileRequestSchema>
export type DeleteTileRequest = z.infer<typeof deleteTileRequestSchema>
