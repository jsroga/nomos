import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  completeTileVariantSelection,
  fetchFidelityRunStatus,
  fetchTileGenerationRunStatus,
  fetchUpscaleRunStatus,
  triggerFidelityEnhancement,
  triggerTileGeneration,
  triggerUpscale,
  triggerUpscaleVariantSelection,
} from '../world-gen-trigger.api'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { VariantSelectionAction } from '@/domains/2d-canvas/constants/tile-generation-service'
import { TileNeighborEdge } from '@/shared/data/server/constants/generation-prompts'

vi.mock('@/shared/data/fetch-json-record', () => ({
  fetchJsonRecord: vi.fn(),
}))

describe('world-gen-trigger.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  describe('fidelity enhancement tasks', () => {
    it('triggerFidelityEnhancement returns runId on success', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({ runId: 'fid-run-123' })

      const result = await triggerFidelityEnhancement({
        tileId: 't-1',
        projectId: 'p-1',
        imageBase64: 'base64img',
        stylePrompt: 'Enhance details',
        creativity: 0.7,
      })

      expect(result.runId).toBe('fid-run-123')
      expect(fetchJsonRecord).toHaveBeenCalledWith(
        '/api/trigger-fidelity',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('triggerFidelityEnhancement throws when runId is missing', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({ error: 'Fidelity task queue full' })

      await expect(
        triggerFidelityEnhancement({
          tileId: 't-1',
          projectId: 'p-1',
          imageBase64: 'base64img',
          stylePrompt: 'Enhance details',
          creativity: 0.7,
        })
      ).rejects.toThrow('Fidelity task queue full')
    })

    it('fetchFidelityRunStatus calls fetch with runId query param', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ status: 'COMPLETED', output: { newUrl: 'https://cdn.example.com/fid.png' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )

      const status = await fetchFidelityRunStatus('fid-run-123')

      expect(status.statusCode).toBe(200)
      expect(status.status).toBe('COMPLETED')
      expect(status.output?.newUrl).toBe('https://cdn.example.com/fid.png')
    })
  })

  describe('tile generation tasks', () => {
    it('triggerTileGeneration passes optional parameters correctly', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({ runId: 'gen-run-456' })

      const result = await triggerTileGeneration({
        projectId: 'p-1',
        x: 2,
        y: 3,
        prompt: 'Mystic lake',
        isFirstTile: false,
        styleReferenceUrls: ['https://example.com/ref.png'],
        neighborImageUrls: { [TileNeighborEdge.Up]: 'https://example.com/north.png' },
      })

      expect(result.runId).toBe('gen-run-456')
      expect(fetchJsonRecord).toHaveBeenCalledWith(
        '/api/trigger-tile',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Mystic lake'),
        })
      )
    })

    it('triggerTileGeneration throws error on missing runId', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({})

      await expect(
        triggerTileGeneration({
          projectId: 'p-1',
          x: 0,
          y: 0,
          prompt: 'Castle',
          isFirstTile: true,
        })
      ).rejects.toThrow('Failed to trigger tile generation task')
    })

    it('fetchTileGenerationRunStatus fetches status correctly', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ status: 'EXECUTING', metadata: { stage: 'generating', progress: 40 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )

      const status = await fetchTileGenerationRunStatus('gen-run-456')

      expect(status.status).toBe('EXECUTING')
      expect(status.metadata?.progress).toBe(40)
    })

    it('completeTileVariantSelection sends completion token POST request', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({})

      await completeTileVariantSelection({
        tokenId: 'token-abc',
        action: VariantSelectionAction.Accept,
        variantIndex: 2,
      })

      expect(fetchJsonRecord).toHaveBeenCalledWith(
        '/api/complete-token',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            tokenId: 'token-abc',
            action: VariantSelectionAction.Accept,
            variantIndex: 2,
          }),
        })
      )
    })
  })

  describe('upscale tasks', () => {
    it('triggerUpscale sends payload and returns runId', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({ runId: 'upscale-run-789' })

      const result = await triggerUpscale({
        tileId: 't-1',
        projectId: 'p-1',
        imageBase64: 'b64data',
        prompt: 'Upscale prompt',
        creativity: 0.5,
        provider: 'stability',
      })

      expect(result.runId).toBe('upscale-run-789')
    })

    it('triggerUpscale throws on failure', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({ error: 'Provider unavailable' })

      await expect(
        triggerUpscale({
          tileId: 't-1',
          projectId: 'p-1',
          imageBase64: 'b64data',
          prompt: 'Upscale prompt',
          creativity: 0.5,
          provider: 'stability',
        })
      ).rejects.toThrow('Provider unavailable')
    })

    it('fetchUpscaleRunStatus fetches upscale status result', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ status: 'COMPLETED' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const result = await fetchUpscaleRunStatus('upscale-run-789')
      expect(result.status).toBe('COMPLETED')
    })

    it('triggerUpscaleVariantSelection sends variant selection request', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({ runId: 'variant-run-1' })

      const result = await triggerUpscaleVariantSelection({
        tileId: 't-1',
        projectId: 'p-1',
        gridImageUrl: 'https://example.com/grid.png',
        variantIndex: 1,
      })

      expect(result.runId).toBe('variant-run-1')
    })
  })
})
