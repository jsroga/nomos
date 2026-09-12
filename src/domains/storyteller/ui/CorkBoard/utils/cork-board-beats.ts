export function beatsInSequenceOrder<T extends { sequence: number }>(beats: readonly T[]): T[] {
  return [...beats].sort((left, right) => left.sequence - right.sequence)
}

export function renumberBeatSequences<T extends { sequence: number }>(beats: readonly T[]): T[] {
  return beats.map((beat, index) => ({ ...beat, sequence: index + 1 }))
}

export function reorderBeatsById<T extends { id: string; sequence: number }>(
  beats: readonly T[],
  draggedId: string,
  targetId: string,
): T[] | null {
  if (!draggedId || draggedId === targetId) return null
  const ordered = beatsInSequenceOrder(beats)
  const draggedIndex = ordered.findIndex(beat => beat.id === draggedId)
  const targetIndex = ordered.findIndex(beat => beat.id === targetId)
  if (draggedIndex === -1 || targetIndex === -1) return null
  const next = [...ordered]
  const [removed] = next.splice(draggedIndex, 1)
  if (!removed) return null
  next.splice(targetIndex, 0, removed)
  return renumberBeatSequences(next)
}
