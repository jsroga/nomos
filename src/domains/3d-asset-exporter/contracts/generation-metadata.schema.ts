/**
 * The generation metadata stored on a 3D asset.
 *
 * Unlike the Meshy result, this shape is **ours** — snake_case is only how it
 * happens to sit in JSONB. The domain form is camelCase, and the mapper beside
 * this file is the one place the two spellings meet.
 *
 * **Strip, not strict, and not passthrough.** Zod's default drops an unknown
 * key rather than rejecting it, which is the right middle here: this reads a
 * JSONB column written by older versions of this code, so `.strict()` would
 * make one stray legacy key discard an asset's entire metadata. Dropping keeps
 * what is known and refuses to carry what is not — so a stray spelling cannot
 * spread the way `.passthrough()` lets one spread.
 *
 * A field this contract *forgot* is caught differently: a test asserts the
 * mapper writes back exactly the keys the schema declares.
 */
import { z } from 'zod'
import { meshyResultWireSchema } from './meshy-result.schema'
import type { MeshyResult } from './meshy-result.schema'

export enum GenerationStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

export enum MeshyTopology {
  Quad = 'quad',
  Triangle = 'triangle',
}

export const generationMetadataRowSchema = z.object({
  trigger_run_id: z.string().optional(),
  meshy_task_id: z.string().optional(),
  generation_status: z.nativeEnum(GenerationStatus).optional(),
  generation_started_at: z.string().optional(),
  generation_result: meshyResultWireSchema.optional(),
  provider: z.string().optional(),
  topology: z.nativeEnum(MeshyTopology).optional(),
  target_polycount: z.number().optional(),
  remesh_run_id: z.string().optional(),
  remesh_status: z.nativeEnum(GenerationStatus).optional(),
  remesh_meshy_task_id: z.string().optional(),
  remesh_result: meshyResultWireSchema.optional(),
})

export type GenerationMetadataRow = z.infer<typeof generationMetadataRowSchema>

/** The domain shape. Everything outside `contracts/` reads this one. */
export interface GenerationMetadata {
  triggerRunId?: string
  meshyTaskId?: string
  generationStatus?: GenerationStatus
  generationStartedAt?: string
  generationResult?: MeshyResult
  provider?: string
  topology?: MeshyTopology
  targetPolycount?: number
  remeshRunId?: string
  remeshStatus?: GenerationStatus
  remeshMeshyTaskId?: string
  remeshResult?: MeshyResult
}
