export function countOccurrences(items: string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    counts[item] = (counts[item] ?? 0) + 1
  }
  return counts
}
