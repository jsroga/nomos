import {
  recordFromJson,
  readRowNumber,
  readRowString,
} from '@/shared/data/json-guards'

export enum MeshyTaskStatusValue {
  Pending = 'PENDING',
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
  status: string
  progress?: number
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
  const message = readRowString(record, 'message')
  return message ? { message } : undefined
}

export function parseMeshyTaskResult(json: unknown): MeshyTaskResult {
  const record = recordFromJson(json)
  const modelUrls = readMeshyModelUrls(record.model_urls)
  const taskError = readMeshyTaskError(record.task_error)

  return {
    status: readRowString(record, 'status') ?? MeshyTaskStatusValue.Pending,
    progress: readRowNumber(record, 'progress'),
    model_url: readRowString(record, 'model_url'),
    model_urls: modelUrls,
    texture_urls: record.texture_urls,
    thumbnail_url: readRowString(record, 'thumbnail_url'),
    error: readRowString(record, 'error'),
    message: readRowString(record, 'message'),
    task_error: taskError,
  }
}

export function parseHyper3dTaskResult(json: unknown): Hyper3dTaskResult {
  const record = recordFromJson(json)
  const outputRecord = recordFromJson(record.output)

  return {
    status: readRowString(record, 'status') ?? 'processing',
    model_url: readRowString(record, 'model_url'),
    output: Object.keys(outputRecord).length
      ? { model_url: readRowString(outputRecord, 'model_url') }
      : undefined,
    error: readRowString(record, 'error'),
    message: readRowString(record, 'message'),
  }
}

export function resolveMeshyModelUrl(result: MeshyTaskResult): string | undefined {
  return result.model_urls?.glb ?? result.model_url
}

export function resolveHyper3dModelUrl(result: Hyper3dTaskResult): string | undefined {
  return result.output?.model_url ?? result.model_url
}
