/** Provider spelling in, domain spelling out. The only place the two meet. */
import { MeshyRemeshField, MESHY_REMESH_TARGET_FORMATS, MESHY_REMESH_ORIGIN_AT } from './constants/meshy-remesh'
import {
  MeshyTaskStatusValue,
  hyper3dTaskWireSchema,
  meshyTaskWireSchema,
  type Hyper3dTask,
  type MeshyTask,
  type RemeshRequest,
} from './meshy-task.schema'

const HYPER3D_DEFAULT_STATUS = 'processing'

/** Meshy reports progress as a number on some endpoints and a string on others. */
function progressToDomain(value: number | string | undefined): number | undefined {
  if (typeof value === 'number') return value
  if (value === undefined) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * Some Meshy endpoints return the task directly and some wrap it under
 * `result`. Unwrapping here is what kept every polling loop from having to
 * know which endpoint it was talking to.
 */
function unwrap(json: unknown): unknown {
  const outer = meshyTaskWireSchema.safeParse(json)
  if (!outer.success) return json
  if (outer.data.status !== undefined) return json
  return outer.data.result ?? json
}

export function parseMeshyTask(json: unknown): MeshyTask {
  const parsed = meshyTaskWireSchema.safeParse(unwrap(json))
  if (!parsed.success) return { status: MeshyTaskStatusValue.Pending }

  const wire = parsed.data
  return {
    id: wire.id,
    status: wire.status ?? MeshyTaskStatusValue.Pending,
    progress: progressToDomain(wire.progress),
    precedingTasks: wire.preceding_tasks,
    modelUrl: wire.model_url,
    modelUrls: wire.model_urls,
    textureUrls: wire.texture_urls,
    thumbnailUrl: wire.thumbnail_url,
    error: wire.error,
    message: wire.message,
    taskError: wire.task_error,
  }
}

export function parseHyper3dTask(json: unknown): Hyper3dTask {
  const parsed = hyper3dTaskWireSchema.safeParse(json)
  if (!parsed.success) return { status: HYPER3D_DEFAULT_STATUS }

  const wire = parsed.data
  return {
    status: wire.status ?? HYPER3D_DEFAULT_STATUS,
    modelUrl: wire.model_url,
    outputModelUrl: wire.output?.model_url,
    error: wire.error,
    message: wire.message,
  }
}

export function resolveMeshyModelUrl(task: MeshyTask): string | undefined {
  return task.modelUrls?.glb ?? task.modelUrl
}

export function resolveHyper3dModelUrl(task: Hyper3dTask): string | undefined {
  return task.outputModelUrl ?? task.modelUrl
}

/**
 * A remesh request in Meshy's spelling.
 *
 * The request body is a wire shape like any other, so it lives here rather
 * than being assembled inside the task — which is where `resize_height` was
 * the module's last stray snake_case key.
 */
export function remeshRequestToWire(request: RemeshRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    [MeshyRemeshField.InputTaskId]: request.meshyTaskId,
    [MeshyRemeshField.TargetFormats]: MESHY_REMESH_TARGET_FORMATS,
    [MeshyRemeshField.Topology]: request.topology,
    [MeshyRemeshField.TargetPolycount]: request.targetPolycount,
    [MeshyRemeshField.OriginAt]: MESHY_REMESH_ORIGIN_AT,
  }
  if (request.resizeHeight && request.resizeHeight > 0) {
    body[MeshyRemeshField.ResizeHeight] = request.resizeHeight
  }
  return body
}
