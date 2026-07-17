import { ContentType, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { fetchJson } from '@/shared/data/fetch-json-record'
import { recordArrayFromJson, recordFromJson, readString } from '@/shared/data/json-guards'
import { buildUrl } from '@/shared/data/url-builder'

const LOOPS_API_ROUTE = '/api/loop-creator/loops'
const INVALID_LOOP_RESPONSE_ERROR = 'Invalid loop response'

export interface PersistedGameLoop {
  id: string
  name: string
  nodes: unknown[]
  edges: unknown[]
  metadata: unknown
  analysis: unknown
  createdAt: string
  updatedAt: string
}

interface SaveLoopInput {
  id?: string
  projectId?: string
  name?: string
  nodes?: unknown
  edges?: unknown
  metadata?: unknown
  analysis?: unknown
}

function persistedGameLoopFromJson(value: unknown): PersistedGameLoop | null {
  const row = recordFromJson(value)
  const id = readString(row.id)
  const name = readString(row.name)
  const createdAt = readString(row.createdAt)
  const updatedAt = readString(row.updatedAt)

  if (!id || !name || !createdAt || !updatedAt) {
    return null
  }

  return {
    id,
    name,
    nodes: recordArrayFromJson(row.nodes),
    edges: recordArrayFromJson(row.edges),
    metadata: row.metadata ?? null,
    analysis: row.analysis ?? null,
    createdAt,
    updatedAt,
  }
}

async function saveLoop(
  method: HttpMethod.Post | HttpMethod.Patch,
  input: SaveLoopInput
): Promise<PersistedGameLoop> {
  const data = await fetchJson(LOOPS_API_ROUTE, {
    method,
    headers: { 'Content-Type': ContentType.Json },
    body: JSON.stringify(input),
  })
  const loop = persistedGameLoopFromJson(data)
  if (!loop) {
    throw new Error(INVALID_LOOP_RESPONSE_ERROR)
  }
  return loop
}

export async function listProjectLoops(projectId: string): Promise<PersistedGameLoop[]> {
  const data = await fetchJson(buildUrl(LOOPS_API_ROUTE, { [QueryParam.ProjectId]: projectId }))
  return recordArrayFromJson(data)
    .map(persistedGameLoopFromJson)
    .filter((loop): loop is PersistedGameLoop => loop !== null)
}

export async function createLoop(input: {
  projectId: string
  name: string
  nodes?: unknown
  edges?: unknown
  metadata?: unknown
  analysis?: unknown
}): Promise<PersistedGameLoop> {
  return saveLoop(HttpMethod.Post, input)
}

export async function updateLoop(input: {
  id: string
  name?: string
  nodes?: unknown
  edges?: unknown
  metadata?: unknown
  analysis?: unknown
}): Promise<PersistedGameLoop> {
  return saveLoop(HttpMethod.Patch, input)
}

export async function deleteLoop(loopId: string): Promise<void> {
  await fetchJson(buildUrl(LOOPS_API_ROUTE, { [QueryParam.Id]: loopId }), {
    method: HttpMethod.Delete,
  })
}
