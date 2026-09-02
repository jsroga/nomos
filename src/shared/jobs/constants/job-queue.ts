/**
 * Queues name a *quota pool*, not a task.
 *
 * The limit being protected belongs to Meshy or Apiframe, not to `generate-tile`
 * — a per-task queue would give each task its own ceiling and no shared one,
 * which is the failure mode this exists to fix.
 */
export enum JobQueue {
  /** Meshy: every 3D generation, remesh, retexture and surface task. */
  Meshy = 'meshy',
  /** Apiframe: tasks whose provider is fixed at definition time. */
  Apiframe = 'apiframe',
  /**
   * Whichever image provider the payload names. Three tasks choose between
   * Apiframe, Gemini, OpenAI and Stability at run time, and a queue is fixed at
   * definition time — so they share one pool rather than claim a provider.
   */
  ImageProvider = 'image-provider',
  /** Fal: SAM-3 object segmentation. */
  Fal = 'fal',
  /** No provider — blob upload, crop, database write. */
  Storage = 'storage',
}

/**
 * A placeholder, not a measurement. The real Meshy / Apiframe / Fal quotas are
 * unknown and the app is low-volume, so the cost of starting too low is a queue
 * that never fills. Raise it from the Trigger dashboard's queue depth once
 * there is traffic: Runs → Queues → concurrency vs queued.
 */
export const JOB_QUEUE_CONCURRENCY_LIMIT = 4
