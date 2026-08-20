import { readString, recordFromJson } from '@/shared/data/json-guards'
import {
  GENERATED_ASSET_TIMESTAMP_PATTERN,
  PosterEpisodeUrlField,
} from '@/domains/storyteller/services/constants/poster-generation-service'

export function readEpisodePosterUrl(episode: unknown): string | null {
  const rec = recordFromJson(episode)
  return (
    readString(rec[PosterEpisodeUrlField.Camel]) ??
    readString(rec[PosterEpisodeUrlField.Snake]) ??
    null
  )
}

export function readGeneratedAssetTimestamp(url: string): number | null {
  const match = GENERATED_ASSET_TIMESTAMP_PATTERN.exec(url)
  const raw = match?.[1]
  if (!raw) return null
  const timestamp = Number(raw)
  return Number.isFinite(timestamp) ? timestamp : null
}

/**
 * Keep the most recently generated URL. Missing timestamps keep `current`
 * so a stale hydrate cannot replace a poster the UI already showed.
 */
export function preferLatestPosterUrl(
  current: string | null | undefined,
  incoming: string | null | undefined,
): string | undefined {
  const left = current?.trim() ?? ''
  const right = incoming?.trim() ?? ''
  if (!left) return right || undefined
  if (!right) return left
  if (left === right) return left
  const leftTs = readGeneratedAssetTimestamp(left)
  const rightTs = readGeneratedAssetTimestamp(right)
  if (leftTs != null && rightTs != null) return leftTs >= rightTs ? left : right
  if (leftTs != null) return left
  if (rightTs != null) return right
  return left
}

export function assignLatestPosterUrl<T extends { posterUrl?: string | null }>(
  prev: T | null,
  url: string,
): T | null {
  if (!prev) return prev
  const next = preferLatestPosterUrl(prev.posterUrl, url)
  if (!next || prev.posterUrl === next) return prev
  return { ...prev, posterUrl: next }
}

/** True when the episode row has a poster that is not the URL from before this run. */
export function isNewerPosterUrl(saved: string | null, baseline: string | undefined): saved is string {
  if (!saved) return false
  const previous = baseline?.trim() ?? ''
  if (!previous) return true
  return saved !== previous
}

/** True when a leftover poster run should be cleared instead of shown as “resumed”. */
export function shouldSettleStoredPosterRun(input: {
  savedPosterUrl: string | null
  baselinePosterUrl: string | undefined
  runSucceeded: boolean
}): boolean {
  if (input.runSucceeded) return true
  return isNewerPosterUrl(input.savedPosterUrl, input.baselinePosterUrl)
}
