import { z } from 'zod'
import { PROJECT_OR_DESIGN_ID_REQUIRED } from '@/domains/3d-canvas/constants/interior-designer-messages'

const dateLikeSchema = z.union([z.string(), z.date()]).transform(value => {
  if (value instanceof Date) {
    return value.toISOString()
  }

  return value
})

const vector3Schema = z.tuple([z.number(), z.number(), z.number()])

const gridResolutionSchema = z.enum(['low', 'medium', 'high'])
const terrainQualitySchema = z.enum(['low', 'medium', 'high'])
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
const textureStyleSchema = z.enum([
  'painterly',
  'realistic',
  'sketch',
  'decay',
  'metallic',
  'organic',
])
const meshyArtStyleSchema = z.enum(['realistic', 'sculpture'])
const topologySchema = z.enum(['triangle', 'quad'])

export const interiorWallSchema = z
  .object({
    id: z.string(),
    start: vector3Schema,
    end: vector3Schema,
    height: z.number(),
    thickness: z.number(),
    texture: z.string().optional(),
    level: z.number().int().optional(),
  })
  .passthrough()

export const interiorFloorSchema = z
  .object({
    id: z.string(),
    points: z.array(vector3Schema),
    y: z.number(),
    texture: z.string().optional(),
    level: z.number().int().optional(),
  })
  .passthrough()

export const interiorWaterSchema = z
  .object({
    id: z.string(),
    points: z.array(vector3Schema),
    y: z.number(),
  })
  .passthrough()

export const interiorSurfaceSchema = z
  .object({
    id: z.string(),
    type: surfaceTypeSchema,
    points: z.array(vector3Schema),
    isPath: z.boolean(),
    curved: z.boolean(),
    width: z.number().optional(),
    layerIndex: z.number().int(),
    texture: z.string().optional(),
    textureScale: z.number().optional(),
    roughness: z.number().optional(),
    metalness: z.number().optional(),
    roundness: z.number().optional(),
    height: z.number().optional(),
    isVertical: z.boolean().optional(),
    rotation: vector3Schema.optional(),
    level: z.number().int().optional(),
  })
  .passthrough()

export const interiorSceneObjectSchema = z
  .object({
    id: z.string(),
    modelUrl: z.string(),
    position: vector3Schema,
    rotation: vector3Schema,
    scale: vector3Schema,
    objectType: z.enum(['generic', 'window', 'door']).optional(),
    color: z.string().optional(),
    groupId: z.string().optional(),
    isLoading: z.boolean().optional(),
    thumbnailUrl: z.string().optional(),
    targetDimensions: vector3Schema.optional(),
    level: z.number().int().optional(),
  })
  .passthrough()

export const interiorTerrainSettingsSchema = z
  .object({
    baseGroundHeight: z.number().optional(),
    waterSurfaceHeight: z.number().optional(),
    showWaterPlane: z.boolean().optional(),
    gridResolution: gridResolutionSchema.optional(),
    quality: terrainQualitySchema.optional(),
    groundColor: z.string().optional(),
    waterColor: z.string().optional(),
    waterOpacity: z.number().optional(),
    sunAngle: z.number().optional(),
    heightmapSize: z.number().int().optional(),
    heightmap: z.array(z.number()).nullable().optional(),
    heightmapVersion: z.number().int().optional(),
    materialMap: z.array(z.number().int()).nullable().optional(),
  })
  .passthrough()

export const interiorSceneDataSchema = z
  .object({
    walls: z.array(interiorWallSchema).default([]),
    floors: z.array(interiorFloorSchema).default([]),
    water: z.array(interiorWaterSchema).default([]),
    surfaces: z.array(interiorSurfaceSchema).default([]),
    objects: z.array(interiorSceneObjectSchema).default([]),
    activeLevel: z.number().int().default(0),
    terrainSettings: interiorTerrainSettingsSchema.nullable().optional(),
  })
  .passthrough()

export const interiorDesignSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    userId: z.string(),
    name: z.string(),
    sceneData: interiorSceneDataSchema,
    createdAt: dateLikeSchema,
    updatedAt: dateLikeSchema,
  })
  .passthrough()

export const interiorDesignListResponseSchema = z.array(interiorDesignSchema)
export const interiorDesignResponseSchema = interiorDesignSchema.nullable()

export const interiorDesignLookupQuerySchema = z
  .object({
    projectId: z.string().min(1).optional(),
    designId: z.string().min(1).optional(),
  })
  .refine(data => data.projectId || data.designId, {
    message: PROJECT_OR_DESIGN_ID_REQUIRED,
  })

export const createInteriorDesignRequestSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  sceneData: interiorSceneDataSchema,
})

export const updateInteriorDesignRequestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  sceneData: interiorSceneDataSchema.optional(),
})

export const deleteInteriorDesignQuerySchema = z.object({
  id: z.string().min(1),
})

export const deleteInteriorDesignResponseSchema = z.object({
  success: z.literal(true),
})

export const interiorTextureRequestSchema = z.object({
  prompt: z.string().min(1),
  apiKey: z.string().min(1),
  style: textureStyleSchema.optional(),
  useSemanticSearch: z.boolean().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

export const interiorTextureResponseSchema = z.object({
  imageUrl: z.string().min(1),
})

export const interiorTexturesRequestSchema = z.object({
  prompt: z.string().min(1),
})

export const interiorTexturesResponseSchema = z.object({
  url: z.string().min(1),
})

export const interiorRetextureRequestSchema = z.object({
  modelUrlOrBase64: z.string().min(1),
  prompt: z.string().min(1),
  assetId: z.string().optional(),
  projectId: z.string().min(1),
  apiKey: z.string().optional(),
})

export const interiorRetextureResponseSchema = z.object({
  runId: z.string().min(1),
})

export const interiorRetextureParamsSchema = z.object({
  runId: z.string().min(1),
})

export const interiorGenerationMetadataSchema = z
  .object({
    progress: z.number().optional(),
    stage: z.string().optional(),
  })
  .passthrough()

export const interiorGenerationOutputSchema = z
  .object({
    success: z.boolean().optional(),
    modelUrl: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    retexturedUrl: z.string().optional(),
    url: z.string().optional(),
    assetId: z.string().optional(),
  })
  .passthrough()

export const interiorRetextureStatusResponseSchema = z.object({
  status: z.string(),
  output: interiorGenerationOutputSchema.nullable().optional(),
  error: z.unknown().optional(),
})

export const interiorTextTo3DRequestSchema = z.object({
  projectId: z.string().min(1),
  prompt: z.string().min(1),
  seed: z.number().int().optional(),
  apiKey: z.string().optional(),
  artStyle: meshyArtStyleSchema.optional(),
  enablePbr: z.boolean().optional(),
  targetPolycount: z.number().int().positive().optional(),
  topology: topologySchema.optional(),
})

export const interiorTextTo3DResponseSchema = z.object({
  success: z.literal(true),
  runId: z.string().min(1),
  publicAccessToken: z.string().min(1),
})

export const interiorTaskParamsSchema = z.object({
  taskId: z.string().min(1),
})

export const interiorTextTo3DStatusResponseSchema = z.object({
  status: z.string(),
  output: interiorGenerationOutputSchema.nullable().optional(),
  error: z.unknown().optional(),
  metadata: interiorGenerationMetadataSchema.optional(),
})

export const interiorMaterialSurfaceBoundsSchema = z.object({
  width: z.number(),
  depth: z.number(),
  centerX: z.number(),
  centerZ: z.number(),
})

export const interiorMaterialRequestSchema = z.object({
  projectId: z.string().min(1),
  surfaceId: z.string().min(1),
  prompt: z.string().min(1),
  apiKey: z.string().optional(),
  artStyle: meshyArtStyleSchema.optional(),
  surfaceBounds: interiorMaterialSurfaceBoundsSchema.optional(),
})

export const interiorMaterialResponseSchema = z.object({
  success: z.literal(true),
  runId: z.string().min(1),
  publicAccessToken: z.string().min(1),
})

export const interiorMaterialStatusResponseSchema = z.object({
  status: z.string(),
  output: interiorGenerationOutputSchema.nullable().optional(),
  error: z.unknown().optional(),
  metadata: interiorGenerationMetadataSchema.optional(),
})

export type InteriorDesign = z.infer<typeof interiorDesignSchema>
export type InteriorSceneData = z.infer<typeof interiorSceneDataSchema>
export type CreateInteriorDesignRequest = z.infer<typeof createInteriorDesignRequestSchema>
export type UpdateInteriorDesignRequest = z.infer<typeof updateInteriorDesignRequestSchema>
export type DeleteInteriorDesignResponse = z.infer<typeof deleteInteriorDesignResponseSchema>
export type InteriorTextureRequest = z.infer<typeof interiorTextureRequestSchema>
export type InteriorTextureResponse = z.infer<typeof interiorTextureResponseSchema>
export type InteriorTexturesRequest = z.infer<typeof interiorTexturesRequestSchema>
export type InteriorTexturesResponse = z.infer<typeof interiorTexturesResponseSchema>
export type InteriorRetextureRequest = z.infer<typeof interiorRetextureRequestSchema>
export type InteriorRetextureResponse = z.infer<typeof interiorRetextureResponseSchema>
export type InteriorRetextureStatusResponse = z.infer<typeof interiorRetextureStatusResponseSchema>
export type InteriorTextTo3DRequest = z.infer<typeof interiorTextTo3DRequestSchema>
export type InteriorTextTo3DResponse = z.infer<typeof interiorTextTo3DResponseSchema>
export type InteriorTextTo3DStatusResponse = z.infer<typeof interiorTextTo3DStatusResponseSchema>
export type InteriorMaterialRequest = z.infer<typeof interiorMaterialRequestSchema>
export type InteriorMaterialResponse = z.infer<typeof interiorMaterialResponseSchema>
export type InteriorMaterialStatusResponse = z.infer<typeof interiorMaterialStatusResponseSchema>
