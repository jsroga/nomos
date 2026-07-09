/**
 * Deep-merge utilities for JSON-like records and typed config objects.
 *
 * - `deepMergeRecords` — nested objects merge; arrays/scalars from source replace.
 * - `deepMerge` / `smartMergeArray` — nested arrays merge by id/name/rule/title when present.
 */

import { isPlainObject, recordFromJson, stringArrayFromJson } from './json-guards'

export { recordFromJson, stringArrayFromJson, stringRecordFromJson } from './json-guards'

const IDENTIFIER_KEYS = ['id', 'name', 'rule', 'title'] as const

function identifierKey(item: unknown): (typeof IDENTIFIER_KEYS)[number] | undefined {
  if (!isPlainObject(item)) return undefined
  return IDENTIFIER_KEYS.find(key => key in item && item[key] != null)
}

export function smartMergeArray(targetArr: unknown[], sourceArr: unknown[]): unknown[] {
  if (!targetArr.length) return [...sourceArr]

  const result = [...targetArr]

  for (const sourceItem of sourceArr) {
    if (!sourceItem) continue

    const key = identifierKey(sourceItem)

    if (key) {
      const sourceId = isPlainObject(sourceItem) ? sourceItem[key] : undefined
      const matchIndex = result.findIndex(
        targetItem => isPlainObject(targetItem) && targetItem[key] === sourceId
      )
      if (matchIndex >= 0) {
        const targetItem = result[matchIndex]
        result[matchIndex] =
          isPlainObject(targetItem) && isPlainObject(sourceItem)
            ? deepMergeRecords(targetItem, sourceItem)
            : sourceItem
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

/**
 * Replace-style deep merge: nested objects merge; arrays and scalars from source win.
 */
export function deepMergeRecords(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  if (!source) return target
  if (!target) return { ...source }

  const result = { ...target }

  for (const [key, sourceValue] of Object.entries(source)) {
    if (sourceValue === null || sourceValue === undefined) continue

    const targetValue = result[key]

    if (Array.isArray(sourceValue)) {
      result[key] = sourceValue
    } else if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      result[key] = deepMergeRecords(targetValue, sourceValue)
    } else {
      result[key] = sourceValue
    }
  }

  return result
}

function mergeWithSmartArrays(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target }

  for (const [key, sourceVal] of Object.entries(source)) {
    if (sourceVal === undefined || sourceVal === null) continue

    const targetVal = result[key]

    if (Array.isArray(sourceVal) && Array.isArray(targetVal)) {
      result[key] = smartMergeArray(targetVal, sourceVal)
    } else if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
      result[key] = mergeWithSmartArrays(targetVal, sourceVal)
    } else {
      result[key] = sourceVal
    }
  }

  return result
}

export function deepMerge<T extends object>(target: T, source: Partial<T>): T
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown>
export function deepMerge(target: object, source: object): object {
  return mergeWithSmartArrays(recordFromJson(target), recordFromJson(source))
}
