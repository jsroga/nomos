/** Drop one key from a string-keyed record without `delete` (eslint no-dynamic-delete). */

export function omitRecordKey<V>(
  record: Record<string, V>,
  key: string,
): Record<string, V> {
  const next: Record<string, V> = {}
  for (const [entryKey, value] of Object.entries(record)) {
    if (entryKey !== key) {
      next[entryKey] = value
    }
  }
  return next
}
