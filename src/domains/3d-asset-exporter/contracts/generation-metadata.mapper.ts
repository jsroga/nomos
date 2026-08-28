/**
 * The only place the stored spelling and the domain spelling meet.
 *
 * A column rename is a change to this file, not a full-text search across the
 * module — which is what 82 snake_case reads across ten files, two of them UI
 * components, had made it.
 */
import {
  generationMetadataRowSchema,
  type GenerationMetadata,
  type GenerationMetadataRow,
} from './generation-metadata.schema'
import type {
  MeshyModelUrls,
  MeshyResult,
  MeshyResultWire,
  MeshyTextureUrls,
} from './meshy-result.schema'

/** Drops keys whose value is undefined, so a patch never writes `null`s. */
function defined<T extends object>(value: T): T {
  const entries = Object.entries(value).filter(([, item]) => item !== undefined)
  return Object(Object.fromEntries(entries))
}

function textureUrlsToDomain(
  wire: MeshyResultWire['texture_urls']
): MeshyTextureUrls[] | undefined {
  return wire?.map(entry =>
    defined<MeshyTextureUrls>({
      baseColor: entry.base_color,
      metallic: entry.metallic,
      normal: entry.normal,
      roughness: entry.roughness,
    })
  )
}

function modelUrlsToDomain(wire: MeshyResultWire['model_urls']): MeshyModelUrls | undefined {
  if (!wire) return undefined
  return defined<MeshyModelUrls>({
    glb: wire.glb,
    fbx: wire.fbx,
    obj: wire.obj,
    usdz: wire.usdz,
    mtl: wire.mtl,
  })
}

function modelUrlsToRow(domain: MeshyModelUrls | undefined) {
  if (!domain) return undefined
  return defined({
    glb: domain.glb,
    fbx: domain.fbx,
    obj: domain.obj,
    usdz: domain.usdz,
    mtl: domain.mtl,
  })
}

export function meshyResultToDomain(wire: MeshyResultWire | undefined): MeshyResult | undefined {
  if (!wire) return undefined
  return defined<MeshyResult>({
    modelUrl: wire.model_url,
    modelUrls: modelUrlsToDomain(wire.model_urls),
    textureUrls: textureUrlsToDomain(wire.texture_urls),
    thumbnailUrl: wire.thumbnail_url,
    progress: wire.progress,
    status: wire.status,
    error: wire.error,
  })
}

function meshyResultToRow(domain: MeshyResult | undefined): MeshyResultWire | undefined {
  if (!domain) return undefined
  return defined<MeshyResultWire>({
    model_url: domain.modelUrl,
    model_urls: modelUrlsToRow(domain.modelUrls),
    texture_urls: domain.textureUrls?.map(entry =>
      defined({
        base_color: entry.baseColor,
        metallic: entry.metallic,
        normal: entry.normal,
        roughness: entry.roughness,
      })
    ),
    thumbnail_url: domain.thumbnailUrl,
    progress: domain.progress,
    status: domain.status,
    error: domain.error,
  })
}

export function generationMetadataToDomain(row: GenerationMetadataRow): GenerationMetadata {
  return defined<GenerationMetadata>({
    triggerRunId: row.trigger_run_id,
    meshyTaskId: row.meshy_task_id,
    generationStatus: row.generation_status,
    generationStartedAt: row.generation_started_at,
    generationResult: meshyResultToDomain(row.generation_result),
    provider: row.provider,
    topology: row.topology,
    targetPolycount: row.target_polycount,
    remeshRunId: row.remesh_run_id,
    remeshStatus: row.remesh_status,
    remeshMeshyTaskId: row.remesh_meshy_task_id,
    remeshResult: meshyResultToDomain(row.remesh_result),
  })
}

export function generationMetadataToRow(
  domain: Partial<GenerationMetadata>
): Partial<GenerationMetadataRow> {
  return defined<Partial<GenerationMetadataRow>>({
    trigger_run_id: domain.triggerRunId,
    meshy_task_id: domain.meshyTaskId,
    generation_status: domain.generationStatus,
    generation_started_at: domain.generationStartedAt,
    generation_result: meshyResultToRow(domain.generationResult),
    provider: domain.provider,
    topology: domain.topology,
    target_polycount: domain.targetPolycount,
    remesh_run_id: domain.remeshRunId,
    remesh_status: domain.remeshStatus,
    remesh_meshy_task_id: domain.remeshMeshyTaskId,
    remesh_result: meshyResultToRow(domain.remeshResult),
  })
}

/**
 * Parse stored metadata into the domain shape.
 *
 * `safeParse` rather than `parse`: this reads a JSONB column written by older
 * versions of this code, and a shape it cannot recognise should degrade to "no
 * metadata" rather than break the asset panel. A malformed *request* would get
 * `parse` and a 400 — the distinction is which side of the edge it comes from.
 */
export function parseGenerationMetadata(value: unknown): GenerationMetadata | null {
  const parsed = generationMetadataRowSchema.safeParse(value)
  if (!parsed.success) return null
  return generationMetadataToDomain(parsed.data)
}
