/** Client poll of Trigger run metadata — 5s × 360 = 30 minutes, matching generate-3d-model maxDuration. */

export const THREE_D_TRIGGER_POLL_INTERVAL_MS = 5_000
export const THREE_D_TRIGGER_MAX_POLLS = 360

export enum ThreeDRunMetadataKey {
  Progress = 'progress',
  MeshyTaskId = 'meshy_task_id',
}
