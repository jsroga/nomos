export function readOptionalStringField(
  record: Record<string, unknown>,
  key: string
): string | undefined {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

export function readStringField(
  record: Record<string, unknown>,
  key: string,
  fallback = ''
): string {
  const value = record[key]
  return typeof value === 'string' ? value : fallback
}

export function readSqlId(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function readSqlSequence(value: unknown): number {
  return typeof value === 'number' ? value : 0
}
