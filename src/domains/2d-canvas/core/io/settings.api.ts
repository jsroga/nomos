import { ContentType, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { recordArrayFromJson, recordFromJson, readString } from '@/shared/data/json-guards'
import { buildUrl, joinUrlPath } from '@/shared/data/url-builder'

import {
  SETTINGS_API_KEYS_ENDPOINT,
  SETTINGS_MCP_CREATE_KEY_FAILED,
  SETTINGS_PROVIDER_PROBE_ENDPOINT,
  SETTINGS_PROVIDERS_ENDPOINT,
} from '../../constants/settings-dialog'

export interface ProviderStatus {
  openai: boolean
  anthropic: boolean
  google: boolean
  zhipu: boolean
  moonshot: boolean
  apiframe: boolean
  legnext: boolean
  stability: boolean
  replicate: boolean
  hyper3d: boolean
  meshy: boolean
  fal: boolean
  voyage: boolean
}

export interface ProviderTestResult {
  ok: boolean
  latencyMs?: number
  model?: string
  error?: string
}

export interface McpApiKey {
  id: string
  name: string
  scopes: string[]
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
  expires_at: string | null
}

export interface ProjectStyleSettings {
  name?: string
  styleReferenceUrls?: string[]
  stylePreset?: string | null
}

function parseProviderStatus(value: unknown): ProviderStatus {
  const record = recordFromJson(value)
  return {
    openai: record.openai === true,
    anthropic: record.anthropic === true,
    google: record.google === true,
    zhipu: record.zhipu === true,
    moonshot: record.moonshot === true,
    apiframe: record.apiframe === true,
    legnext: record.legnext === true,
    stability: record.stability === true,
    replicate: record.replicate === true,
    hyper3d: record.hyper3d === true,
    meshy: record.meshy === true,
    fal: record.fal === true,
    voyage: record.voyage === true,
  }
}

function parseProviderTestResult(value: unknown): ProviderTestResult {
  const record = recordFromJson(value)
  return {
    ok: record.ok === true,
    latencyMs: typeof record.latencyMs === 'number' ? record.latencyMs : undefined,
    model: readString(record.model) ?? undefined,
    error: readString(record.error) ?? undefined,
  }
}

function parseMcpApiKey(value: unknown): McpApiKey {
  const record = recordFromJson(value)
  return {
    id: readString(record.id) ?? '',
    name: readString(record.name) ?? '',
    scopes: recordArrayFromJson(record.scopes).map(item => readString(item) ?? '').filter(Boolean),
    created_at: readString(record.created_at) ?? '',
    last_used_at: readString(record.last_used_at) ?? null,
    revoked_at: readString(record.revoked_at) ?? null,
    expires_at: readString(record.expires_at) ?? null,
  }
}

function parseProjectStyleSettings(value: unknown): ProjectStyleSettings {
  const record = recordFromJson(value)
  const styleReferenceUrls = recordArrayFromJson(record.styleReferenceUrls)
    .map(item => readString(item))
    .filter((url): url is string => Boolean(url))
  return {
    name: readString(record.name) ?? undefined,
    styleReferenceUrls,
    stylePreset: readString(record.stylePreset) ?? null,
  }
}

export const settingsApi = {
  async fetchProviders(): Promise<ProviderStatus> {
    const data = await fetchJsonRecord(SETTINGS_PROVIDERS_ENDPOINT)
    return parseProviderStatus(data.providers)
  },

  async probeProvider(providerKey: string): Promise<ProviderTestResult> {
    const data = await fetchJsonRecord(SETTINGS_PROVIDER_PROBE_ENDPOINT, {
      method: HttpMethod.Post,
      headers: { 'Content-Type': ContentType.Json },
      body: JSON.stringify({ providerKey }),
    })
    return parseProviderTestResult(data)
  },

  async fetchMcpKeys(): Promise<McpApiKey[]> {
    const data = await fetchJsonRecord(SETTINGS_API_KEYS_ENDPOINT)
    return recordArrayFromJson(data.apiKeys).map(parseMcpApiKey)
  },

  async createMcpKey(name: string): Promise<{ plainKey: string; apiKey: McpApiKey }> {
    const data = await fetchJsonRecord(SETTINGS_API_KEYS_ENDPOINT, {
      method: HttpMethod.Post,
      headers: { 'Content-Type': ContentType.Json },
      body: JSON.stringify({ name }),
    })
    const created = recordFromJson(data.apiKey)
    const plainKey = readString(created.key)
    if (!plainKey) {
      throw new Error(SETTINGS_MCP_CREATE_KEY_FAILED)
    }
    return { plainKey, apiKey: parseMcpApiKey(created) }
  },

  async revokeMcpKey(keyId: string): Promise<void> {
    await fetchJsonRecord(buildUrl(SETTINGS_API_KEYS_ENDPOINT, { [QueryParam.Id]: keyId }), {
      method: HttpMethod.Delete,
    })
  },

  async fetchProject(projectId: string): Promise<ProjectStyleSettings> {
    const data = await fetchJsonRecord(joinUrlPath('/api/storyteller/projects', projectId))
    return parseProjectStyleSettings(data)
  },

  async patchProjectStyle(
    projectId: string,
    body: Record<string, unknown>
  ): Promise<void> {
    await fetchJsonRecord(joinUrlPath('/api/storyteller/projects', projectId), {
      method: HttpMethod.Patch,
      headers: { 'Content-Type': ContentType.Json },
      body: JSON.stringify(body),
    })
  },
}
