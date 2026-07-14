/**
 * Type guards and readers for untyped JSON / API payloads (no `as` casts).
 */

import {
  CUSTOM_EVENT_DETAIL_KEY,
  SQL_RESULT_ROWS_KEY,
} from '@/shared/data/constants/json-guards'

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function recordFromJson(value: unknown): Record<string, unknown> {
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value))
  }
  return {}
}

export function recordArrayFromJson(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter(isPlainObject)
}

export function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function firstNonEmptyRecord(...candidates: unknown[]): Record<string, unknown> {
  for (const candidate of candidates) {
    const record = recordFromJson(candidate)
    if (Object.keys(record).length > 0) return record
  }
  return {}
}

export function isCustomEvent(event: Event): event is CustomEvent {
  return CUSTOM_EVENT_DETAIL_KEY in event
}

export function customEventDetail(event: Event): unknown {
  return isCustomEvent(event) ? event.detail : undefined
}

export function customEventDetailRecord(event: Event): Record<string, unknown> {
  return recordFromJson(customEventDetail(event))
}

/** Records that include a non-empty `name` string. */
export function namedRecordsFromJson(value: unknown): Array<Record<string, unknown> & { name: string }> {
  return recordArrayFromJson(value).filter(
    (row): row is Record<string, unknown> & { name: string } =>
      typeof row.name === 'string' && row.name.length > 0
  )
}

/** Coerce an untyped JSON value to a string-valued record (non-string entries dropped). */
export function stringRecordFromJson(value: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, entry] of Object.entries(recordFromJson(value))) {
    if (typeof entry === 'string') result[key] = entry
  }
  return result
}

export function stringArrayFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export function fileReaderText(result: string | ArrayBuffer | null | undefined): string | null {
  return typeof result === 'string' ? result : null
}

export function readRowString(row: Record<string, unknown>, key: string): string | undefined {
  return readString(row[key])
}

export function readRowNumber(row: Record<string, unknown>, key: string): number | undefined {
  return readNumber(row[key])
}

export function sqlResultRows(result: unknown): Record<string, unknown>[] {
  if (typeof result !== 'object' || result === null) return []
  if (SQL_RESULT_ROWS_KEY in result && Array.isArray(result.rows)) {
    return result.rows.filter(
      (row): row is Record<string, unknown> =>
        typeof row === 'object' && row !== null && !Array.isArray(row)
    )
  }
  if (Array.isArray(result)) {
    return result.filter(
      (row): row is Record<string, unknown> =>
        typeof row === 'object' && row !== null && !Array.isArray(row)
    )
  }
  return []
}
