/** Stable episode list order and 1-based display ordinals. */

const MISSING_SEQUENCE_RANK = Number.MAX_SAFE_INTEGER

export function episodeSortRank(sequence: number | null | undefined): number {
  return typeof sequence === 'number' && sequence > 0 ? sequence : MISSING_SEQUENCE_RANK
}

export function sortEpisodesForDisplay<T extends { id: string; sequence?: number | null }>(
  episodes: T[]
): T[] {
  return [...episodes].sort((left, right) => {
    const rank = episodeSortRank(left.sequence) - episodeSortRank(right.sequence)
    if (rank !== 0) return rank
    return left.id.localeCompare(right.id)
  })
}

export function episodeDisplayOrdinal<T extends { id: string }>(
  episodes: T[],
  episodeId: string | null | undefined
): number {
  if (!episodeId) return 1
  const index = episodes.findIndex(episode => episode.id === episodeId)
  return index >= 0 ? index + 1 : 1
}
