import { z } from 'zod'
import { AppModuleId, ContentType, FetchCache, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { ClientFetchError, fetchJson } from '@/shared/data/fetch-json-record'
import { buildUrl, joinUrlPath } from '@/shared/data/url-builder'
import {
  ChatSessionBodyKey,
  ChatSessionsApiHeader,
  ChatSessionsApiPath,
  ChatSessionsApiSegment,
  ChatSessionStatus,
} from '@/shared/chat/core/constants/chat-session'
import {
  chatSessionListSchema,
  chatSessionSchema,
  patchChatSessionBodySchema,
  type ChatSession,
  type PatchChatSessionBody,
} from '@/shared/chat/core/io/chat-session-contract'

export async function listChatSessions(projectId: string): Promise<ChatSession[]> {
  const data = await fetchJson(
    buildUrl(ChatSessionsApiPath.Root, { [QueryParam.ProjectId]: projectId }),
    { cache: FetchCache.NoStore },
  )
  return chatSessionListSchema.parse(data)
}

export async function createChatSession(input: {
  projectId: string
  moduleId: AppModuleId
}): Promise<ChatSession> {
  const data = await fetchJson(ChatSessionsApiPath.Root, {
    method: HttpMethod.Post,
    headers: { [ChatSessionsApiHeader.ContentType]: ContentType.Json },
    body: JSON.stringify({
      [ChatSessionBodyKey.ProjectId]: input.projectId,
      [ChatSessionBodyKey.ModuleId]: input.moduleId,
    }),
  })
  return chatSessionSchema.parse(data)
}

export function chatSessionPatchBody(patch: PatchChatSessionBody): PatchChatSessionBody {
  return patchChatSessionBodySchema.parse(patch)
}

export async function patchChatSession(id: string, patch: PatchChatSessionBody): Promise<ChatSession> {
  const body = chatSessionPatchBody(patch)
  const data = await fetchJson(joinUrlPath(ChatSessionsApiPath.Root, id), {
    method: HttpMethod.Patch,
    headers: { [ChatSessionsApiHeader.ContentType]: ContentType.Json },
    body: JSON.stringify(body),
  })
  return chatSessionSchema.parse(data)
}

export async function deleteChatSession(id: string): Promise<void> {
  const response = await fetch(joinUrlPath(ChatSessionsApiPath.Root, id), {
    method: HttpMethod.Delete,
  })
  if (!response.ok) {
    throw new ClientFetchError(`Request failed with status ${response.status}`, response.status)
  }
}

export async function fetchChatSessionMessages(id: string): Promise<unknown[]> {
  const data = await fetchJson(
    joinUrlPath(ChatSessionsApiPath.Root, id, ChatSessionsApiSegment.Messages),
    { cache: FetchCache.NoStore },
  )
  const parsed = z.object({ messages: z.array(z.unknown()) }).safeParse(data)
  return parsed.success ? parsed.data.messages : []
}

export async function markChatSessionStreaming(id: string): Promise<ChatSession> {
  return patchChatSession(id, { [ChatSessionBodyKey.Status]: ChatSessionStatus.Streaming })
}

export async function markChatSessionIdle(id: string): Promise<ChatSession> {
  return patchChatSession(id, {
    [ChatSessionBodyKey.Status]: ChatSessionStatus.Idle,
    [ChatSessionBodyKey.RunId]: null,
  })
}
