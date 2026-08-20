import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import { fetchJson, fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { recordFromJson, readString, stringArrayFromJson } from '@/shared/data/json-guards'
import { buildUrl } from '@/shared/data/url-builder'
import { GameEntityQueryParam } from '@/shared/data/constants/game-entities-wire'
import type { EntityType, GameEntity, SourceDomain } from '@/shared/data/queries/useGameEntities'
import {
  EntityApiQueryParam,
  GAME_ENTITY_FETCH_ERROR,
  GameEntityTypeId,
  GameSourceDomainId,
} from '../constants/game-entity-mentions'

const PROVIDERS_ENDPOINT = '/api/settings/providers'
const CHAT_LLM_JUDGE_API_PATH = '/api/chat/llm-judge'
const ENTITIES_API_PATH = '/api/entities'

const ENTITY_TYPES = Object.values(GameEntityTypeId)
const SOURCE_DOMAINS = Object.values(GameSourceDomainId)

function parseEntityType(value: unknown): EntityType | null {
  const match = ENTITY_TYPES.find(type => type === value)
  return match ?? null
}

function parseSourceDomain(value: unknown): SourceDomain | null {
  const match = SOURCE_DOMAINS.find(domain => domain === value)
  return match ?? null
}

function parseGameEntity(value: unknown): GameEntity | null {
  const row = recordFromJson(value)
  const id = readString(row.id)
  const name = readString(row.name)
  const projectId = readString(row.projectId)
  const userId = readString(row.userId)
  const entityType = parseEntityType(row.entityType)
  const sourceDomain = parseSourceDomain(row.sourceDomain)
  const createdAt = readString(row.createdAt)
  const updatedAt = readString(row.updatedAt)

  if (!id || !name || !projectId || !userId || !entityType || !sourceDomain || !createdAt || !updatedAt) {
    return null
  }

  return {
    id,
    projectId,
    userId,
    entityType,
    name,
    description: readString(row.description) ?? undefined,
    sourceDomain,
    sourceEntityId: readString(row.sourceEntityId) ?? undefined,
    usedInDomains: stringArrayFromJson(row.usedInDomains),
    metadata: recordFromJson(row.metadata),
    tags: stringArrayFromJson(row.tags),
    imageUrl: readString(row.imageUrl) ?? undefined,
    createdAt,
    updatedAt,
  }
}

export interface ProviderStatusResponse {
  providers: Record<string, boolean>
}

export interface ChatEvalResult {
  score: number
  feedback: string
  criteria: Record<string, { score: number; comment: string }>
}

export async function fetchProviderStatus(): Promise<ProviderStatusResponse> {
  const data = await fetchJsonRecord(PROVIDERS_ENDPOINT)
  return {
    providers:
      typeof data.providers === 'object' && data.providers !== null
        ? Object.fromEntries(
            Object.entries(data.providers).filter(
              (entry): entry is [string, boolean] => typeof entry[1] === 'boolean'
            )
          )
        : {},
  }
}

export async function evaluateChatConversation(payload: {
  conversation: Array<Record<string, unknown>>
  criteria: string[]
}): Promise<ChatEvalResult> {
  const data = await fetchJson(CHAT_LLM_JUDGE_API_PATH, {
    method: HttpMethod.Post,
    headers: { 'Content-Type': ContentType.Json },
    body: JSON.stringify(payload),
  })

  const record = recordFromJson(data)
  const score = typeof record.score === 'number' ? record.score : 0
  const feedback = typeof record.feedback === 'string' ? record.feedback : ''
  const rawCriteria =
    typeof record.criteria === 'object' && record.criteria !== null
      ? recordFromJson(record.criteria)
      : {}

  return {
    score,
    feedback,
    criteria: Object.fromEntries(
      Object.entries(rawCriteria).filter(
        (entry): entry is [string, { score: number; comment: string }] => {
          if (typeof entry[1] !== 'object' || entry[1] === null) {
            return false
          }
          const value = recordFromJson(entry[1])
          return typeof value.score === 'number' && typeof value.comment === 'string'
        }
      )
    ),
  }
}

/** POST chat stream endpoint — returns raw Response for SSE processing. */
export async function postChatStream(
  endpoint: string,
  payload: Record<string, unknown>,
  init?: { signal?: AbortSignal; headers?: Record<string, string> }
): Promise<Response> {
  return fetch(endpoint, {
    method: HttpMethod.Post,
    headers: { 'Content-Type': ContentType.Json, ...init?.headers },
    body: JSON.stringify(payload),
    signal: init?.signal,
  })
}

export async function resumeChatWorkflow(
  resumeUrl: string,
  body: {
    runId: string
    selectedOption: string
    additionalFeedback?: string
  }
): Promise<{ ok: boolean; result?: unknown; errorText?: string }> {
  const response = await fetch(resumeUrl, {
    method: HttpMethod.Post,
    headers: { 'Content-Type': ContentType.Json },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    return { ok: false, errorText: await response.text() }
  }

  return { ok: true, result: await response.json() }
}

export async function fetchGameEntitiesForMentions(
  projectId: string,
  search?: string,
  signal?: AbortSignal
): Promise<GameEntity[]> {
  const data = await fetchJsonRecord(
    buildUrl(ENTITIES_API_PATH, {
      [GameEntityQueryParam.ProjectId]: projectId,
      [EntityApiQueryParam.Search]: search,
    }),
    signal ? { signal } : undefined
  )

  if (!Array.isArray(data.entities)) {
    throw new Error(GAME_ENTITY_FETCH_ERROR)
  }

  return data.entities
    .map(parseGameEntity)
    .filter((entity): entity is GameEntity => entity !== null)
}
