/** Shared types for 3D asset exporter panel generation / remesh flows. */

import { recordFromJson } from '@/shared/data/json-guards'

export interface MeshyResult {
  model_url?: string
  model_urls?: {
    glb?: string
    fbx?: string
    obj?: string
    usdz?: string
    mtl?: string
  }
  texture_urls?: Array<{
    base_color?: string
    metallic?: string
    normal?: string
    roughness?: string
  }>
  thumbnail_url?: string
  progress?: number
  status?: string
  error?: string
}

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

export enum MeshyOutputKey {
  Result = 'result',
  Message = 'message',
}

function parseGenerationStatus(value: unknown): GenerationStatus | undefined {
  if (value === GenerationStatus.Pending) return GenerationStatus.Pending
  if (value === GenerationStatus.Processing) return GenerationStatus.Processing
  if (value === GenerationStatus.Completed) return GenerationStatus.Completed
  if (value === GenerationStatus.Failed) return GenerationStatus.Failed
  return undefined
}

export interface GenerationMetadata {
  trigger_run_id?: string
  meshy_task_id?: string
  generation_status?: GenerationStatus | `${GenerationStatus}`
  generation_started_at?: string
  generation_result?: MeshyResult
  provider?: string
  topology?: MeshyTopology
  target_polycount?: number
  remesh_run_id?: string
  remesh_status?: GenerationStatus | `${GenerationStatus}`
  remesh_meshy_task_id?: string
  remesh_result?: MeshyResult
}

export function readStatusErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && MeshyOutputKey.Message in error) {
    const message = Reflect.get(error, MeshyOutputKey.Message)
    if (typeof message === 'string' && message.length > 0) return message
  }
  return fallback
}

export function isMeshyResult(value: unknown): value is MeshyResult {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readMeshyResultFromOutput(
  output: Record<string, unknown> | undefined
): MeshyResult | undefined {
  if (!output || !(MeshyOutputKey.Result in output)) return undefined
  const result = Reflect.get(output, MeshyOutputKey.Result)
  return isMeshyResult(result) ? result : undefined
}

export function readMeshyTaskId(metadata: Record<string, unknown> | undefined): string | undefined {
  if (!metadata) return undefined
  const value = metadata.meshy_task_id
  return typeof value === 'string' ? value : undefined
}

export function parseGenerationMetadata(value: unknown): GenerationMetadata | null {
  if (!isMeshyResult(value)) return null
  const row = recordFromJson(value)
  const result: GenerationMetadata = {}
  if (typeof row.trigger_run_id === 'string') result.trigger_run_id = row.trigger_run_id
  if (typeof row.meshy_task_id === 'string') result.meshy_task_id = row.meshy_task_id
  const generationStatus = parseGenerationStatus(row.generation_status)
  if (generationStatus) result.generation_status = generationStatus
  if (typeof row.generation_started_at === 'string') {
    result.generation_started_at = row.generation_started_at
  }
  if (isMeshyResult(row.generation_result)) result.generation_result = row.generation_result
  if (typeof row.provider === 'string') result.provider = row.provider
  if (row.topology === MeshyTopology.Quad || row.topology === MeshyTopology.Triangle) {
    result.topology = row.topology
  }
  if (typeof row.target_polycount === 'number') result.target_polycount = row.target_polycount
  if (typeof row.remesh_run_id === 'string') result.remesh_run_id = row.remesh_run_id
  const remeshStatus = parseGenerationStatus(row.remesh_status)
  if (remeshStatus) result.remesh_status = remeshStatus
  if (typeof row.remesh_meshy_task_id === 'string') result.remesh_meshy_task_id = row.remesh_meshy_task_id
  if (isMeshyResult(row.remesh_result)) result.remesh_result = row.remesh_result
  return result
}
