import type { PendingAction } from './bible-context-types'

/** Premise overlays are episode-scoped; bible overlays have no episodeId and always show. */
export function pendingActionForCurrentEpisode(
  pending: PendingAction | undefined,
  currentEpisodeId: string | null,
): PendingAction | undefined {
  if (!pending) return undefined
  if (!pending.episodeId) return pending
  if (!currentEpisodeId || pending.episodeId !== currentEpisodeId) return undefined
  return pending
}
