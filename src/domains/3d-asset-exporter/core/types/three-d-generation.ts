/**
 * Shared types for the 3D asset exporter panel.
 *
 * The shapes themselves live in `contracts/` — parsed once at the edge, in
 * camelCase, with the stored snake_case confined to the mapper. This file
 * re-exports them so the module's existing import paths keep working, and
 * holds the few helpers that read a Trigger run's output rather than the
 * asset's own metadata.
 */

import {
  meshyResultToDomain,
  meshyResultWireSchema,
  type MeshyResult,
} from '@/domains/3d-asset-exporter/contracts'

/** Keys of a Trigger run's output for a Meshy task. */
export enum MeshyOutputKey {
  Result = 'result',
  Message = 'message',
}

/** The metadata key Trigger writes the Meshy task id under. */
const MESHY_TASK_ID_KEY = 'meshy_task_id'

export {
  GenerationStatus,
  MeshyTopology,
  generationMetadataToRow,
  parseGenerationMetadata,
  type GenerationMetadata,
  type MeshyModelUrls,
  type MeshyResult,
  type MeshyTextureUrls,
} from '@/domains/3d-asset-exporter/contracts'

/**
 * The Meshy task id off a Trigger run's metadata bag.
 *
 * The snake_case key is Trigger's, and it is named once here rather than read
 * at each of the three polling sites that used to reach for it.
 */
export function readMeshyTaskId(metadata: Record<string, unknown> | undefined): string | undefined {
  const value = metadata?.[MESHY_TASK_ID_KEY]
  return typeof value === 'string' ? value : undefined
}

export function readStatusErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && MeshyOutputKey.Message in error) {
    const message = Reflect.get(error, MeshyOutputKey.Message)
    if (typeof message === 'string' && message.length > 0) return message
  }
  return fallback
}

/**
 * A Trigger run's `output.result`, parsed into the domain shape.
 *
 * Returns undefined rather than throwing: a run whose output does not match is
 * a run with no usable result, and the panel already handles that.
 */
export function readMeshyResultFromOutput(
  output: Record<string, unknown> | undefined
): MeshyResult | undefined {
  if (!output || !(MeshyOutputKey.Result in output)) return undefined
  const parsed = meshyResultWireSchema.safeParse(Reflect.get(output, MeshyOutputKey.Result))
  return parsed.success ? meshyResultToDomain(parsed.data) : undefined
}
