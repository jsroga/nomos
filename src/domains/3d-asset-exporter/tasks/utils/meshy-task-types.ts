/**
 * Meshy task-status shapes.
 *
 * The parsing lives in `contracts/` — this file re-exports it so the task
 * files' import paths keep working, and holds the progress arithmetic, which
 * is our interpretation of the provider's number rather than part of its shape.
 */

export {
  MeshyTaskStatusValue,
  parseHyper3dTask,
  parseMeshyTask,
  resolveHyper3dModelUrl,
  resolveMeshyModelUrl,
  type Hyper3dTask,
  type MeshyModelUrls,
  type MeshyTask,
} from '@/domains/3d-asset-exporter/contracts'

import { MeshyTaskStatusValue } from '@/domains/3d-asset-exporter/contracts'

const MESHY_PROGRESS_MAX = 100

/**
 * Meshy reports progress as either a 0–1 fraction or a 0–100 percentage, and
 * only the value tells you which. `1` is ambiguous: complete on a fraction,
 * one percent on a percentage — so it counts as complete only when the status
 * agrees.
 */
export function meshyProgressPercent(progress: number | undefined, status: string): number {
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
