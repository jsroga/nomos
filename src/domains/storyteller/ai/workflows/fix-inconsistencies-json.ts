import '@/shared/data/server-guard'

/**
 * JSON.stringify(undefined) returns undefined, not a string — Mastra then
 * drops the key and the next workflow step fails Required on sectionsJson.*.
 */
export function stringifyCanonJson(value: unknown, fallback: string): string {
  if (value === undefined) return fallback
  try {
    const text = JSON.stringify(value)
    return typeof text === 'string' ? text : fallback
  } catch {
    return fallback
  }
}
