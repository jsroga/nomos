import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  blobToDataUrl,
  blobToRawBase64,
  generateSingleWorldTile,
} from '../generate-single-world-tile'
import { tileGenerationService } from '@/domains/2d-canvas/state/client-services/tile-generation-service'
import type { Tile } from '@/domains/2d-canvas'

class MockFileReader {
  result: string | null = null
  onloadend: (() => void) | null = null
  onerror: (() => void) | null = null

  readAsDataURL(blob: Blob) {
    if (blob.size === 0) {
      this.onerror?.()
      return
    }
    blob.text().then(text => {
      const b64 = Buffer.from(text).toString('base64')
      this.result = `data:image/png;base64,${b64}`
      this.onloadend?.()
    })
  }
}

if (typeof globalThis.FileReader === 'undefined') {
  Object.defineProperty(globalThis, 'FileReader', {
    value: MockFileReader,
    writable: true,
  })
}

if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: {
      location: {
        origin: 'http://localhost:3000',
      },
    },
    writable: true,
  })
} else if (!globalThis.window.location) {
  Object.defineProperty(globalThis.window, 'location', {
    value: { origin: 'http://localhost:3000' },
    writable: true,
  })
}

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/domains/2d-canvas/state/client-services/tile-generation-service', () => ({
  tileGenerationService: {
    generate: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/shared/ai/contextAssembler', () => ({
  assembleContextImage: vi.fn().mockResolvedValue({
    imageBlob: new Blob(['fake_assembled_image']),
    maskBlob: new Blob(['fake_assembled_mask']),
    directNeighborCount: 1,
    cropRect: { x: 0, y: 0, width: 512, height: 512 },
    packedWidth: 1024,
    packedHeight: 1024,
    strategy: { mode: 'horizontal', weightedNeighbors: [] },
  }),
}))

vi.mock('@/domains/2d-canvas/core/io/world-data.api', () => ({
  fetchUrlAsDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,mockNeighbor'),
}))

describe('generate-single-world-tile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('blob utilities', () => {
    it('blobToDataUrl converts non-empty Blob to data URL string', async () => {
      const blob = new Blob(['hello world'], { type: 'text/plain' })
      const result = await blobToDataUrl(blob)
      expect(result).toMatch(/^data:.*base64,/)
    })

    it('blobToRawBase64 extracts raw base64 portion without prefix', async () => {
      const blob = new Blob(['raw test bytes'], { type: 'text/plain' })
      const result = await blobToRawBase64(blob)
      expect(result).not.toContain('data:')
      expect(result).not.toContain(';base64,')
    })

    it('blobToDataUrl rejects on empty blob', async () => {
      const emptyBlob = new Blob([])
      await expect(blobToDataUrl(emptyBlob)).rejects.toThrow()
    })
  })

  describe('generateSingleWorldTile orchestration', () => {
    const setErrorMock = vi.fn()
    const setDebugInfoMock = vi.fn()

    it('generates tile when no neighbors exist (first tile flow)', async () => {
      const emptyTiles: Record<string, Tile> = {}

      await generateSingleWorldTile({
        projectId: 'proj-1',
        x: 0,
        y: 0,
        tiles: emptyTiles,
        tilePrompt: 'Lush valley',
        masterPrompt: 'High fantasy',
        effectiveStyleUrls: ['https://example.com/style.png'],
        setError: setErrorMock,
        setGenerationDebugInfo: setDebugInfoMock,
      })

      expect(tileGenerationService.generate).toHaveBeenCalledWith(
        'proj-1',
        0,
        0,
        'Lush valley',
        ['https://example.com/style.png'],
        undefined
      )
      expect(setErrorMock).not.toHaveBeenCalled()
    })

    it('generates tile with assembled context when neighbors exist', async () => {
      const tilesWithNeighbor: Record<string, Tile> = {
        '0,1': {
          id: 'tile-0-1',
          project_id: 'proj-1',
          x: 0,
          y: 1,
          tile_prompt: 'Neighbor tile',
          image_filename: '0_1.png',
          created_at: '2026-08-01T00:00:00Z',
        },
      }

      await generateSingleWorldTile({
        projectId: 'proj-1',
        x: 0,
        y: 0,
        tiles: tilesWithNeighbor,
        tilePrompt: 'Path connecting south',
        masterPrompt: 'High fantasy',
        effectiveStyleUrls: [],
        setError: setErrorMock,
        setGenerationDebugInfo: setDebugInfoMock,
      })

      expect(tileGenerationService.generate).toHaveBeenCalledWith(
        'proj-1',
        0,
        0,
        'Path connecting south',
        [],
        expect.objectContaining({
          images: expect.any(Object),
          maskBase64: expect.any(String),
        })
      )
      expect(setErrorMock).not.toHaveBeenCalled()
    })

    it('sets error and calls toast when tile generation fails', async () => {
      vi.mocked(tileGenerationService.generate).mockRejectedValueOnce(
        new Error('Generation queue timeout')
      )

      await generateSingleWorldTile({
        projectId: 'proj-1',
        x: 0,
        y: 0,
        tiles: {},
        tilePrompt: 'Volcano',
        masterPrompt: '',
        effectiveStyleUrls: [],
        setError: setErrorMock,
        setGenerationDebugInfo: setDebugInfoMock,
      })

      expect(setErrorMock).toHaveBeenCalledWith('Generation failed: Generation queue timeout')
    })
  })
})
