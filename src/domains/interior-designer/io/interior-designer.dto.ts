import { z } from 'zod'

const idSchema = z.string().min(1)
const isoDateTimeSchema = z.string().min(1)
const vector3Schema = z.tuple([z.number(), z.number(), z.number()])

const surfaceTypeSchema = z.enum([
  'grass',
  'water',
  'road',
  'dirt',
  'pavement',
  'mars',
  'sand',
  'rock',
  'wall',
])

const gridResolutionSchema = z.enum(['low', 'medium', 'high'])
const terrainQualitySchema = z.enum(['low', 'medium', 'high'])
const objectTypeSchema = z.enum(['generic', 'window', 'door'])
const textureStyleSchema = z.enum([
  'painterly',
  'realistic',
  'sketch',
  'decay',
  'metallic',
  'organic',
])
const meshyArtStyleSchema = z.enum(['realistic', 'sculpture'])
const meshyTopologySchema = z.enum(['triangle', 'quad'])

const surfaceBoundsSchema = z.object({
  width: z.number(),
  depth: z.number(),
  centerX: z.number(),
  centerZ: z.number(),
})

const interiorWallSchema = z.object({
  id: idSchema,
  start: vector3Schema,
  end: vector3Schema,
  height: z.number(),
  thickness: z.number(),
  texture: z.string().min(1).optional(),
  level: z.number().optional(),
})

const interiorFloorSchema = z.object({
  id: idSchema,
  points: z.array(vector3Schema),
  y: z.number(),
  texture: z.string().min(1).optional(),
  level: z.number().optional(),
})

const interiorWaterSchema = z.object({
  id: idSchema,
  points: z.array(vector3Schema),
  y: z.number(),
})

const interiorSurfaceSchema = z.object({
  id: idSchema,
  type: surfaceTypeSchema,
  points: z.array(vector3Schema),
  isPath: z.boolean(),
  curved: z.boolean(),
  width: z.number().optional(),
  layerIndex: z.number(),
  texture: z.string().min(1).optional(),
  textureScale: z.number().optional(),
  roughness: z.number().optional(),
  metalness: z.number().optional(),
  roundness: z.number().optional(),
  height: z.number().optional(),
  isVertical: z.boolean().optional(),
  rotation: vector3Schema.optional(),
  level: z.number().optional(),
})

const interiorSceneObjectSchema = z.object({
  id: idSchema,
  modelUrl: z.string().min(1),
  position: vector3Schema,
  rotation: vector3Schema,
  scale: vector3Schema,
  objectType: objectTypeSchema.optional(),
  color: z.string().min(1).optional(),
  groupId: idSchema.optional(),
  isLoading: z.boolean().optional(),
  thumbnailUrl: z.string().min(1).optional(),
  targetDimensions: vector3Schema.optional(),
  level: z.number().optional(),
})

const terrainSettingsSchema = z.object({
  baseGroundHeight: z.number().optional(),
  waterSurfaceHeight: z.number().optional(),
  showWaterPlane: z.boolean().optional(),
  gridResolution: gridResolutionSchema.optional(),
  quality: terrainQualitySchema.optional(),
  groundColor: z.string().min(1).optional(),
  waterColor: z.string().min(1).optional(),
  waterOpacity: z.number().optional(),
  sunAngle: z.number().optional(),
  heightmapSize: z.number().int().nonnegative().optional(),
  heightmap: z.array(z.number()).nullable().optional(),
  heightmapVersion: z.number().int().nonnegative().optional(),
  materialMap: z.array(z.number().int()).nullable().optional(),
})

export const interiorDesignSceneDataSchema = z.object({
  walls: z.array(interiorWallSchema).default([]),
  floors: z.array(interiorFloorSchema).default([]),
  water: z.array(interiorWaterSchema).default([]),
  surfaces: z.array(interiorSurfaceSchema).default([]),
  objects: z.array(interiorSceneObjectSchema).default([]),
  activeLevel: z.number().default(0),
  terrainSettings: terrainSettingsSchema.nullish(),
})

export const interiorDesignSummarySchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  updatedAt: isoDateTimeSchema,
})

export const interiorDesignDetailSchema = interiorDesignSummarySchema.extend({
  projectId: idSchema,
  userId: idSchema,
  createdAt: isoDateTimeSchema,
  sceneData: interiorDesignSceneDataSchema,
})

export const interiorDesignSummaryListSchema = z.array(interiorDesignSummarySchema)

export const createInteriorDesignRequestSchema = z.object({
  projectId: idSchema,
  name: z.string().min(1),
  sceneData: interiorDesignSceneDataSchema,
})

export const updateInteriorDesignRequestSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).optional(),
    sceneData: interiorDesignSceneDataSchema.optional(),
  })
  .refine(input => input.name !== undefined || input.sceneData !== undefined, {
    message: 'At least one of name or sceneData is required',
  })

export const deleteInteriorDesignResponseSchema = z.object({
  success: z.boolean(),
})

export const textureGenerationRequestSchema = z.object({
  prompt: z.string().min(1),
  apiKey: z.string().min(1),
  style: textureStyleSchema.optional(),
  useSemanticSearch: z.boolean().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

export const textureGenerationResponseSchema = z.object({
  imageUrl: z.string().min(1),
})

export const surfaceMaterialRequestSchema = z.object({
  projectId: idSchema,
  surfaceId: idSchema,
  prompt: z.string().min(1),
  apiKey: z.string().min(1).optional(),
  artStyle: meshyArtStyleSchema.optional(),
  surfaceBounds: surfaceBoundsSchema,
})

export const surfaceMaterialStartResponseSchema = z.object({
  success: z.boolean(),
  runId: z.string().min(1),
  publicAccessToken: z.string().min(1),
})

export const retextureRequestSchema = z.object({
  modelUrlOrBase64: z.string().min(1),
  prompt: z.string().min(1),
  assetId: z.string().min(1).optional(),
  projectId: z.string().min(1),
  apiKey: z.string().min(1).optional(),
})

export const retextureStartResponseSchema = z.object({
  runId: z.string().min(1),
})

export const textTo3DRequestSchema = z.object({
  projectId: idSchema,
  prompt: z.string().min(1),
  seed: z.number().int().optional(),
  apiKey: z.string().min(1).optional(),
  artStyle: meshyArtStyleSchema.optional(),
  enablePbr: z.boolean().optional(),
  targetPolycount: z.number().int().positive().optional(),
  topology: meshyTopologySchema.optional(),
})

export const textTo3DStartResponseSchema = z.object({
  success: z.boolean(),
  runId: z.string().min(1),
  publicAccessToken: z.string().min(1),
})

export const interiorDesignerJobStatusSchema = z.object({
  status: z.string().min(1),
  output: z.unknown().optional(),
  error: z.unknown().optional(),
  metadata: z.unknown().optional(),
})

function serializeDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

export function toInteriorDesignSummary(input: {
  id: string
  name: string
  updatedAt: Date | string
}) {
  return interiorDesignSummarySchema.parse({
    id: input.id,
    name: input.name,
    updatedAt: serializeDate(input.updatedAt),
  })
}

export function toInteriorDesignDetail(input: {
  id: string
  projectId: string
  userId: string
  name: string
  sceneData: unknown
  createdAt: Date | string
  updatedAt: Date | string
}) {
  return interiorDesignDetailSchema.parse({
    id: input.id,
    projectId: input.projectId,
    userId: input.userId,
    name: input.name,
    sceneData: input.sceneData,
    createdAt: serializeDate(input.createdAt),
    updatedAt: serializeDate(input.updatedAt),
  })
}

export type InteriorDesignSceneData = z.infer<typeof interiorDesignSceneDataSchema>
export type InteriorDesignSummary = z.infer<typeof interiorDesignSummarySchema>
export type InteriorDesignDetail = z.infer<typeof interiorDesignDetailSchema>
export type CreateInteriorDesignRequest = z.infer<typeof createInteriorDesignRequestSchema>
export type UpdateInteriorDesignRequest = z.infer<typeof updateInteriorDesignRequestSchema>
export type DeleteInteriorDesignResponse = z.infer<typeof deleteInteriorDesignResponseSchema>
export type TextureGenerationRequest = z.infer<typeof textureGenerationRequestSchema>
export type TextureGenerationResponse = z.infer<typeof textureGenerationResponseSchema>
export type SurfaceMaterialRequest = z.infer<typeof surfaceMaterialRequestSchema>
export type SurfaceMaterialStartResponse = z.infer<typeof surfaceMaterialStartResponseSchema>
export type RetextureRequest = z.infer<typeof retextureRequestSchema>
export type RetextureStartResponse = z.infer<typeof retextureStartResponseSchema>
export type TextTo3DRequest = z.infer<typeof textTo3DRequestSchema>
export type TextTo3DStartResponse = z.infer<typeof textTo3DStartResponseSchema>
export type InteriorDesignerJobStatus = z.infer<typeof interiorDesignerJobStatusSchema>
