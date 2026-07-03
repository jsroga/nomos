/**
 * Shared deep-merge utilities for story plan and config updates.
 */

export function smartMergeArray(targetArr: unknown[], sourceArr: unknown[]): unknown[] {
  if (!targetArr || !targetArr.length) return [...sourceArr]

  const result = [...targetArr]

  for (const sourceItem of sourceArr) {
    if (!sourceItem) continue

    const identifierKey = ['id', 'name', 'rule', 'title'].find(
      k =>
        typeof sourceItem === 'object' &&
        sourceItem !== null &&
        k in sourceItem &&
        (sourceItem as Record<string, unknown>)[k]
    )

    if (identifierKey) {
      const matchIndex = result.findIndex(
        targetItem =>
          targetItem &&
          typeof targetItem === 'object' &&
          (targetItem as Record<string, unknown>)[identifierKey] ===
            (sourceItem as Record<string, unknown>)[identifierKey]
      )
      if (matchIndex >= 0) {
        result[matchIndex] = deepMerge(
          result[matchIndex] as Record<string, unknown>,
          sourceItem as Record<string, unknown>
        )
      } else {
        result.push(sourceItem)
      }
    } else if (typeof sourceItem === 'string' || typeof sourceItem === 'number') {
      if (!result.includes(sourceItem)) result.push(sourceItem)
    } else {
      result.push(sourceItem)
    }
  }

  return result
}

export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target } as T

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceVal = source[key]
    const targetVal = target[key]

    if (sourceVal === undefined || sourceVal === null) continue

    if (Array.isArray(sourceVal) && Array.isArray(targetVal)) {
      result[key] = smartMergeArray(targetVal, sourceVal) as T[keyof T]
    } else if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(sourceVal) &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      ) as T[keyof T]
    } else {
      result[key] = sourceVal as T[keyof T]
    }
  }

  return result
}
