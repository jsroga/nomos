import { ThreeDRunMetadataKey } from '../../constants/three-d-polling'

const PROGRESS_MIN = 0
const PROGRESS_MAX = 100

function clampPercent(value: number): number {
  return Math.min(PROGRESS_MAX, Math.max(PROGRESS_MIN, Math.round(value)))
}

export function readProgressPercent(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clampPercent(value)
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return clampPercent(parsed)
  }
  return undefined
}

export function readRunProgress(
  metadata: Record<string, unknown> | undefined,
): number | undefined {
  if (!metadata) return undefined
  return readProgressPercent(metadata[ThreeDRunMetadataKey.Progress])
}
