import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'

const CHAT_STREAM_ROUTE = '/api/storyteller/chat/stream'

/** POST storyteller chat stream — returns raw Response for SSE processing. */
export async function postStorytellerChatStream(
  body: Record<string, unknown>,
  init?: { signal?: AbortSignal }
): Promise<Response> {
  return fetch(CHAT_STREAM_ROUTE, {
    method: HttpMethod.Post,
    headers: { 'Content-Type': ContentType.Json },
    body: JSON.stringify(body),
    signal: init?.signal,
  })
}
