import {
  isPlainObject,
  recordFromJson,
  readRowNumber,
  readRowString,
} from '@/shared/data/json-guards'
import { MeshyResponseField } from '@/shared/ai/constants/meshy'

export enum MeshyTaskStatusValue {
  Pending = 'PENDING',
  InProgress = 'IN_PROGRESS',
  Succeeded = 'SUCCEEDED',
  Failed = 'FAILED',
}

export interface MeshyModelUrls {
  glb?: string
  fbx?: string
  obj?: string
  usdz?: string
  mtl?: string
}

export interface MeshyTaskResult {
  id?: string
  status: string
  progress?: number
  preceding_tasks?: number
  model_url?: string
  model_urls?: MeshyModelUrls
  texture_urls?: unknown
  thumbnail_url?: string
  error?: string
  message?: string
  task_error?: { message?: string }
}

export interface Hyper3dTaskResult {
  status: string
  model_url?: string
  output?: { model_url?: string }
  error?: string
  message?: string
}

const MESHY_PROGRESS_MAX = 100

export function meshyProgressPercent(
  progress: number | undefined,
  status: string,
): number {
  if (progress === undefined || !Number.isFinite(progress)) return 0
  if (progress > 1) {
    return Math.min(MESHY_PROGRESS_MAX, Math.max(0, Math.round(progress)))
  }
  if (progress === 1) {
    return status === MeshyTaskStatusValue.Succeeded ? MESHY_PROGRESS_MAX : 0
  }
  if (progress === 0) return 0
  return Math.min(MESHY_PROGRESS_MAX, Math.max(0, Math.round(progress * MESHY_PROGRESS_MAX)))
}

function unwrapMeshyTaskRecord(json: unknown): Record<string, unknown> {
  const record = recordFromJson(json)
  if (readRowString(record, MeshyResponseField.Status) !== undefined) {
    return record
  }
  const nested = record[MeshyResponseField.Result]
  if (isPlainObject(nested)) {
    return nested
  }
  return record
}

function readMeshyModelUrls(value: unknown): MeshyModelUrls | undefined {
  const record = recordFromJson(value)
  if (Object.keys(record).length === 0) {
    return undefined
  }
  return {
    glb: readRowString(record, 'glb'),
    fbx: readRowString(record, 'fbx'),
    obj: readRowString(record, 'obj'),
    usdz: readRowString(record, 'usdz'),
    mtl: readRowString(record, 'mtl'),
  }
}

function readMeshyTaskError(value: unknown): { message?: string } | undefined {
  const record = recordFromJson(value)
  if (Object.keys(record).length === 0) {
    return undefined
  }
  const message = readRowString(record, MeshyResponseField.Message)
  return message ? { message } : undefined
}

function readMeshyProgress(record: Record<string, unknown>): number | undefined {
  const numeric = readRowNumber(record, MeshyResponseField.Progress)
  if (numeric !== undefined) return numeric
  const asString = readRowString(record, MeshyResponseField.Progress)
  if (asString === undefined) return undefined
  const parsed = Number(asString)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function parseMeshyTaskResult(json: unknown): MeshyTaskResult {
  const record = unwrapMeshyTaskRecord(json)
  const modelUrls = readMeshyModelUrls(record[MeshyResponseField.ModelUrls])
  const taskError = readMeshyTaskError(record[MeshyResponseField.TaskError])

  return {
    id: readRowString(record, MeshyResponseField.Id),
    status: readRowString(record, MeshyResponseField.Status) ?? MeshyTaskStatusValue.Pending,
    progress: readMeshyProgress(record),
    preceding_tasks: readRowNumber(record, MeshyResponseField.PrecedingTasks),
    model_url: readRowString(record, MeshyResponseField.ModelUrl),
    model_urls: modelUrls,
    texture_urls: record.texture_urls,
    thumbnail_url: readRowString(record, MeshyResponseField.ThumbnailUrl),
    error: readRowString(record, 'error'),
    message: readRowString(record, MeshyResponseField.Message),
    task_error: taskError,
  }
}

export function parseHyper3dTaskResult(json: unknown): Hyper3dTaskResult {
  const record = recordFromJson(json)
  const outputRecord = recordFromJson(record[MeshyResponseField.Output])

  return {
    status: readRowString(record, MeshyResponseField.Status) ?? 'processing',
    model_url: readRowString(record, MeshyResponseField.ModelUrl),
    output: Object.keys(outputRecord).length
      ? { model_url: readRowString(outputRecord, MeshyResponseField.ModelUrl) }
      : undefined,
    error: readRowString(record, 'error'),
    message: readRowString(record, MeshyResponseField.Message),
  }
}

export function resolveMeshyModelUrl(result: MeshyTaskResult): string | undefined {
  return result.model_urls?.glb ?? result.model_url
}

export function resolveHyper3dModelUrl(result: Hyper3dTaskResult): string | undefined {
  return result.output?.model_url ?? result.model_url
}
