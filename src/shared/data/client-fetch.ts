'use client'

import { HttpMethod, ContentType } from '@/shared/data/constants/protocol'
import { fetchJson } from '@/shared/data/fetch-json-record'

import {
  ClientFetchError as SharedClientFetchError,
  fetchJsonRecord,
} from '@/shared/data/fetch-json-record'

export { fetchJson, fetchJsonRecord }
export const ClientFetchError = SharedClientFetchError

export async function postJson<TBody extends Record<string, unknown>>(
  url: string,
  body: TBody
): Promise<unknown> {
  return fetchJson(url, {
    method: HttpMethod.Post,
    headers: { 'Content-Type': ContentType.Json },
    body: JSON.stringify(body),
  })
}
