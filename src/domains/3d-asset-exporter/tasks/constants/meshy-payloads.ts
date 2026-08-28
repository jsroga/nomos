/**
 * Payload contracts for the four Meshy tasks. Each task's type derives from
 * its schema, so the shape is declared once.
 */
import { z } from 'zod'
import { OWNED_PAYLOAD_SHAPE } from '@/shared/jobs/submission-nonce'
import { MeshyArtStyle, MeshyTopology } from '@/shared/data/constants/protocol'

/** Meshy's texturing model generations, as its API names them. */
export enum MeshyRetextureModel {
  Latest = 'latest',
  Meshy4 = 'meshy-4',
  Meshy5 = 'meshy-5',
}

export const remesh3dModelPayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  assetId: z.string().min(1),
  meshyTaskId: z.string().min(1),
  apiKey: z.string().min(1),
  topology: z.nativeEnum(MeshyTopology),
  targetPolycount: z.number(),
  resizeHeight: z.number().optional(),
})

export type Remesh3dModelPayload = z.infer<typeof remesh3dModelPayloadSchema>

export const retextureModelPayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  /** The asset being retextured, or the one a new version is created from. */
  assetId: z.string().min(1),
  /** A data URI, a bare base64 string, or a public URL. */
  modelBase64: z.string().min(1),
  prompt: z.string(),
  apiKey: z.string().min(1),
  aiModel: z.nativeEnum(MeshyRetextureModel).optional(),
  styleImageUrl: z.string().optional(),
})

export type RetextureModelPayload = z.infer<typeof retextureModelPayloadSchema>

export const surfaceMaterialPayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  surfaceId: z.string().min(1),
  prompt: z.string(),
  apiKey: z.string().min(1),
  artStyle: z.nativeEnum(MeshyArtStyle).optional(),
  /** Carried for metadata only; Meshy does not read it. */
  surfaceBounds: z
    .object({
      width: z.number(),
      depth: z.number(),
      centerX: z.number(),
      centerZ: z.number(),
    })
    .optional(),
})

export type SurfaceMaterialPayload = z.infer<typeof surfaceMaterialPayloadSchema>

export const textTo3dPayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  prompt: z.string(),
  seed: z.number(),
  apiKey: z.string().min(1),
  artStyle: z.nativeEnum(MeshyArtStyle).optional(),
  enablePbr: z.boolean().optional(),
  targetPolycount: z.number().optional(),
  topology: z.nativeEnum(MeshyTopology).optional(),
})

export type TextTo3dPayload = z.infer<typeof textTo3dPayloadSchema>
