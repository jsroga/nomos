import { beforeEach, describe, expect, it, vi } from 'vitest'
import { settingsApi } from '../settings.api'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'

vi.mock('@/shared/data/fetch-json-record', () => ({
  fetchJsonRecord: vi.fn(),
}))

describe('settings.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchProviders', () => {
    it('fetches providers and parses active flags', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({
        providers: {
          openai: true,
          anthropic: true,
          stability: false,
          fal: true,
        },
      })

      const status = await settingsApi.fetchProviders()

      expect(status.openai).toBe(true)
      expect(status.anthropic).toBe(true)
      expect(status.stability).toBe(false)
      expect(status.fal).toBe(true)
      expect(status.google).toBe(false) // missing flags default to false
    })
  })

  describe('probeProvider', () => {
    it('probes a provider and returns latency and model info', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({
        ok: true,
        latencyMs: 145,
        model: 'gpt-4o',
      })

      const result = await settingsApi.probeProvider('openai')

      expect(result.ok).toBe(true)
      expect(result.latencyMs).toBe(145)
      expect(result.model).toBe('gpt-4o')
      expect(result.error).toBeUndefined()
    })

    it('handles probe error response', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({
        ok: false,
        error: 'Invalid API key',
      })

      const result = await settingsApi.probeProvider('stability')

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Invalid API key')
    })
  })

  describe('MCP API keys management', () => {
    it('fetchMcpKeys returns parsed list of keys', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({
        apiKeys: [
          {
            id: 'key-1',
            name: 'Cursor MCP',
            scopes: ['read', 'write'],
            created_at: '2026-08-01T00:00:00Z',
            last_used_at: null,
            revoked_at: null,
            expires_at: null,
          },
        ],
      })

      const keys = await settingsApi.fetchMcpKeys()

      expect(keys).toHaveLength(1)
      expect(keys[0].id).toBe('key-1')
      expect(keys[0].name).toBe('Cursor MCP')
      expect(keys[0].scopes).toEqual(['read', 'write'])
    })

    it('createMcpKey returns plaintext key and metadata', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({
        apiKey: {
          id: 'key-new',
          name: 'Claude Desktop',
          key: 'mcp_live_secret_12345',
          scopes: ['read'],
          created_at: '2026-08-20T00:00:00Z',
        },
      })

      const result = await settingsApi.createMcpKey('Claude Desktop')

      expect(result.plainKey).toBe('mcp_live_secret_12345')
      expect(result.apiKey.id).toBe('key-new')
      expect(result.apiKey.name).toBe('Claude Desktop')
    })

    it('createMcpKey throws error if plainKey is missing in response', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({
        apiKey: {
          id: 'key-new',
        },
      })

      await expect(settingsApi.createMcpKey('Test')).rejects.toThrow()
    })

    it('revokeMcpKey sends DELETE request with ID query param', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({})

      await settingsApi.revokeMcpKey('key-to-revoke')

      expect(fetchJsonRecord).toHaveBeenCalledWith(
        expect.stringContaining('id=key-to-revoke'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('project settings', () => {
    it('fetchProject returns parsed project settings', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({
        name: 'Dungeon Crawler',
        style_preset: 'dark-pixel',
        generation_mode: 'midjourney-turbo',
      })

      const project = await settingsApi.fetchProject('proj-123')

      expect(project.name).toBe('Dungeon Crawler')
      expect(project.stylePreset).toBe('dark-pixel')
      expect(project.generationMode).toBe('midjourney-turbo')
    })

    it('patchProjectStyle sends PATCH request with payload', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({})

      await settingsApi.patchProjectStyle('proj-123', {
        style_preset: 'isometric-oil',
      })

      expect(fetchJsonRecord).toHaveBeenCalledWith(
        '/api/storyteller/projects/proj-123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ style_preset: 'isometric-oil' }),
        })
      )
    })
  })
})
