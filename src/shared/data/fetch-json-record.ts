import { recordFromJson } from '@/shared/data/json-guards'

/** Parse a JSON API response into a record. Throws on non-OK HTTP status. */
export async function fetchJsonRecord(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Record<string, unknown>> {
  const response = await fetch(input, init)

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return recordFromJson(await response.json())
}
