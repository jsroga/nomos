import { recordFromJson } from '@/shared/data/json-guards'

enum ClientFetchErrorName {
  ClientFetchError = 'ClientFetchError',
}

export class ClientFetchError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = ClientFetchErrorName.ClientFetchError
    this.status = status
  }
}

/** Parse JSON from a successful HTTP response. Throws ClientFetchError on non-OK status. */
export async function fetchJson(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<unknown> {
  const response = await fetch(input, init)

  if (!response.ok) {
    throw new ClientFetchError(`Request failed with status ${response.status}`, response.status)
  }

  return response.json()
}

/** Parse a JSON API response into a record. Throws on non-OK HTTP status. */
export async function fetchJsonRecord(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Record<string, unknown>> {
  return recordFromJson(await fetchJson(input, init))
}
