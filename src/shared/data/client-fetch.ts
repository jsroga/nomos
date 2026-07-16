'use client'

import { HttpMethod } from '@/shared/data/constants/protocol'

export class ClientFetchError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ClientFetchError'
    this.status = status
  }
}

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

export async function postJson<TBody extends Record<string, unknown>>(
  url: string,
  body: TBody
): Promise<unknown> {
  return fetchJson(url, {
    method: HttpMethod.Post,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
