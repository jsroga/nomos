/**
 * Meshy's task result, as Meshy sends it.
 *
 * snake_case here is **their** wire format, not ours, so it is confined to this
 * schema and its mapper. Nothing downstream should ever read `model_urls`.
 *
 * `.passthrough()` on purpose: this is a provider boundary. Meshy adds fields
 * without warning, and rejecting an unrecognised key would turn a working
 * generation into a crash for no benefit — we read the fields we named.
 */
import { z } from 'zod'

export const meshyModelUrlsWireSchema = z
  .object({
    glb: z.string().optional(),
    fbx: z.string().optional(),
    obj: z.string().optional(),
    usdz: z.string().optional(),
    mtl: z.string().optional(),
  })
  .passthrough() // contract-boundary: Meshy adds model formats without notice

export const meshyTextureUrlWireSchema = z
  .object({
    base_color: z.string().optional(),
    metallic: z.string().optional(),
    normal: z.string().optional(),
    roughness: z.string().optional(),
  })
  .passthrough() // contract-boundary: Meshy adds texture maps without notice

export const meshyResultWireSchema = z
  .object({
    model_url: z.string().optional(),
    model_urls: meshyModelUrlsWireSchema.optional(),
    texture_urls: z.array(meshyTextureUrlWireSchema).optional(),
    thumbnail_url: z.string().optional(),
    progress: z.number().optional(),
    status: z.string().optional(),
    error: z.string().optional(),
  })
  .passthrough() // contract-boundary: a provider response; we read what we named

export type MeshyResultWire = z.infer<typeof meshyResultWireSchema>

/** The domain shape: camelCase, and the only one the module reads. */
export interface MeshyTextureUrls {
  baseColor?: string
  metallic?: string
  normal?: string
  roughness?: string
}

export interface MeshyModelUrls {
  glb?: string
  fbx?: string
  obj?: string
  usdz?: string
  mtl?: string
}

export interface MeshyResult {
  modelUrl?: string
  modelUrls?: MeshyModelUrls
  textureUrls?: MeshyTextureUrls[]
  thumbnailUrl?: string
  progress?: number
  status?: string
  error?: string
}
