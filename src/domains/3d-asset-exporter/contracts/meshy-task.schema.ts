/**
 * A Meshy (or Hyper3D) *task status* response, as the provider sends it.
 *
 * Distinct from `meshy-result.schema.ts`, which is the result object we store
 * on an asset: this is the polling shape, with a status, a progress figure and
 * the provider's own error envelope.
 *
 * It replaces seventy lines of hand-written field-by-field guarding whose
 * output type was snake_case, so every polling loop read the provider's
 * spelling directly.
 */
import { z } from 'zod'
import { meshyModelUrlsWireSchema } from './meshy-result.schema'
import type { MeshyModelUrls } from './meshy-result.schema'

export enum MeshyTaskStatusValue {
  Pending = 'PENDING',
  InProgress = 'IN_PROGRESS',
  Succeeded = 'SUCCEEDED',
  Failed = 'FAILED',
}

/** Meshy reports progress as a number on some endpoints and a string on others. */
const progressWireSchema = z.union([z.number(), z.string()])

export const meshyTaskWireSchema = z
  .object({
    id: z.string().optional(),
    status: z.string().optional(),
    progress: progressWireSchema.optional(),
    preceding_tasks: z.number().optional(),
    model_url: z.string().optional(),
    model_urls: meshyModelUrlsWireSchema.optional(),
    texture_urls: z.unknown().optional(),
    thumbnail_url: z.string().optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    task_error: z.object({ message: z.string().optional() }).optional(),
    /** Some endpoints wrap the task under `result`; unwrapped by the mapper. */
    result: z.unknown().optional(),
  })
  .passthrough() // contract-boundary: a provider response; we read what we named

export const hyper3dTaskWireSchema = z
  .object({
    status: z.string().optional(),
    model_url: z.string().optional(),
    output: z.object({ model_url: z.string().optional() }).optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough() // contract-boundary: a provider response; we read what we named

/** The domain shape. Everything outside `contracts/` reads this one. */
export interface MeshyTask {
  id?: string
  status: string
  progress?: number
  precedingTasks?: number
  modelUrl?: string
  modelUrls?: MeshyModelUrls
  textureUrls?: unknown
  thumbnailUrl?: string
  error?: string
  message?: string
  taskError?: { message?: string }
}

export interface Hyper3dTask {
  status: string
  modelUrl?: string
  outputModelUrl?: string
  error?: string
  message?: string
}

/** What a remesh request needs, in this codebase's vocabulary. */
export interface RemeshRequest {
  meshyTaskId: string
  topology: string
  targetPolycount: number
  resizeHeight?: number
}
