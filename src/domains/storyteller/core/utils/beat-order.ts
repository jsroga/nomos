export const BEAT_SEQUENCE_REORDER_OFFSET = 10_000

export function nextSequenceAfter(maxSequence: number | null | undefined): number {
  return (maxSequence ?? 0) + 1
}

export function parkedBeatSequence(sequence: number): number {
  return sequence + BEAT_SEQUENCE_REORDER_OFFSET
}

export function completeBeatOrder(
  orderedIds: readonly string[],
  existing: readonly { id: string; sequence: number }[],
): string[] {
  const existingIds = new Set(existing.map(row => row.id))
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of orderedIds) {
    if (!existingIds.has(id) || seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  const rest = [...existing]
    .sort((left, right) => left.sequence - right.sequence)
    .filter(row => !seen.has(row.id))
  for (const row of rest) {
    result.push(row.id)
  }
  return result
}
