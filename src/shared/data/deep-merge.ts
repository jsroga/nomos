/**
 * Deep-merge utilities for JSON-like records and typed config objects.
 *
 * - `deepMergeRecords` — nested objects merge; arrays/scalars from source replace.
 * - `deepMerge` / `smartMergeArray` — nested arrays merge by id/name/rule/title when present.
 */

import { produce } from 'immer'

import { isPlainObject, recordFromJson } from './json-guards'
import { DEEP_MERGE_IDENTIFIER_KEYS } from '@/shared/data/constants/deep-merge'

export { recordFromJson, stringArrayFromJson, stringRecordFromJson } from './json-guards'

const IDENTIFIER_KEYS = DEEP_MERGE_IDENTIFIER_KEYS

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

  return produce(target, draft => {
    for (const [key, sourceValue] of Object.entries(source)) {
      if (sourceValue === null || sourceValue === undefined) continue

      const targetValue = draft[key]

      if (Array.isArray(sourceValue)) {
        draft[key] = sourceValue
      } else if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        draft[key] = deepMergeRecords(recordFromJson(targetValue), recordFromJson(sourceValue))
      } else {
        draft[key] = sourceValue
      }
    }
  })
}

function mergeWithSmartArrays(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  return produce(target, draft => {
    for (const [key, sourceVal] of Object.entries(source)) {
      if (sourceVal === undefined || sourceVal === null) continue

      const targetVal = draft[key]

      if (Array.isArray(sourceVal) && Array.isArray(targetVal)) {
        draft[key] = smartMergeArray(targetVal, sourceVal)
      } else if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
        draft[key] = mergeWithSmartArrays(recordFromJson(targetVal), recordFromJson(sourceVal))
      } else {
        draft[key] = sourceVal
      }
    }
  })
}

export function deepMerge<T extends object>(target: T, source: Partial<T>): T
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown>
export function deepMerge(target: object, source: object): object {
  return mergeWithSmartArrays(recordFromJson(target), recordFromJson(source))
}
