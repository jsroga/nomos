import type { UpscaleProvider } from '../../core/upscale-provider-wire'

export interface UpscaleRunState {
  runId: string
  tileId: string
  tileX: number
  tileY: number
  projectId: string
  provider: UpscaleProvider
  startedAt: string
}

export interface MjGridStoragePayload {
  gridImageUrl: string
  taskId: string
  buttons: unknown[]
  tileId: string
  projectId: string
  runState?: UpscaleRunState
}
