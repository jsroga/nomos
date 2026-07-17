/** SSE payload narrowing helpers (parsed JSON is unknown — narrow, don't cast). */

export enum StreamPayloadField {
  Content = 'content',
  Type = 'type',
  Id = 'id',
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecordValue(value) ? value : undefined
}

export function frameType(data: Record<string, unknown>): string | undefined {
  return asString(data.type)
}
