import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  collectAffectedTiles,
  compositeRepaintOntoTile,
  getTileRangeForBounds,
  tileOverlapsRepaintBounds,
  type RepaintBounds,
} from '../repaint-tile-composite'
import type { Tile } from '../../../core/world-types'

class MockImageElement {
  width = 512
  height = 512
  src = ''
}

if (typeof globalThis.Image === 'undefined') {
  Object.defineProperty(globalThis, 'Image', {
    value: MockImageElement,
    writable: true,
  })
}

describe('repaint-tile-composite', () => {
  describe('getTileRangeForBounds', () => {
    it('calculates bounding tile coordinates for a standard 512px tile size', () => {
      const bounds: RepaintBounds = { x: 100, y: 200, width: 600, height: 400 }
      const range = getTileRangeForBounds(bounds, 512)

      expect(range).toEqual({
        minTileX: 0,
        maxTileX: 1,
        minTileY: 0,
        maxTileY: 1,
      })
    })

    it('handles negative coordinates correctly', () => {
      const bounds: RepaintBounds = { x: -600, y: -200, width: 300, height: 100 }
      const range = getTileRangeForBounds(bounds, 512)

      expect(range).toEqual({
        minTileX: -2,
        maxTileX: -1,
        minTileY: -1,
        maxTileY: -1,
      })
    })

    it('handles small bounds entirely within one tile', () => {
      const bounds: RepaintBounds = { x: 10, y: 10, width: 50, height: 50 }
      const range = getTileRangeForBounds(bounds, 512)

      expect(range).toEqual({
        minTileX: 0,
        maxTileX: 0,
        minTileY: 0,
        maxTileY: 0,
      })
    })
  })

  describe('tileOverlapsRepaintBounds', () => {
    const tileSize = 512
    const bounds: RepaintBounds = { x: 100, y: 100, width: 500, height: 500 }

    it('returns true when tile overlaps bounds', () => {
      expect(tileOverlapsRepaintBounds(0, 0, tileSize, bounds)).toBe(true)
      expect(tileOverlapsRepaintBounds(1, 0, tileSize, bounds)).toBe(true)
      expect(tileOverlapsRepaintBounds(0, 1, tileSize, bounds)).toBe(true)
      expect(tileOverlapsRepaintBounds(1, 1, tileSize, bounds)).toBe(true)
    })

    it('returns false when tile is completely outside bounds', () => {
      expect(tileOverlapsRepaintBounds(2, 2, tileSize, bounds)).toBe(false)
      expect(tileOverlapsRepaintBounds(-1, 0, tileSize, bounds)).toBe(false)
      expect(tileOverlapsRepaintBounds(0, -1, tileSize, bounds)).toBe(false)
      expect(tileOverlapsRepaintBounds(0, 2, tileSize, bounds)).toBe(false)
    })

    it('returns false when tile touches edge without area overlap', () => {
      const edgeBounds: RepaintBounds = { x: 512, y: 0, width: 100, height: 100 }
      expect(tileOverlapsRepaintBounds(0, 0, tileSize, edgeBounds)).toBe(false)
    })
  })

  describe('collectAffectedTiles', () => {
    it('returns all tile coordinates that overlap bounds within range', () => {
      const bounds: RepaintBounds = { x: 400, y: 400, width: 300, height: 300 }
      const affected = collectAffectedTiles(0, 1, 0, 1, bounds, 512)

      expect(affected).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ])
    })

    it('returns empty array when none overlap within provided range', () => {
      const bounds: RepaintBounds = { x: 1000, y: 1000, width: 100, height: 100 }
      const affected = collectAffectedTiles(0, 0, 0, 0, bounds, 512)

      expect(affected).toEqual([])
    })
  })

  describe('compositeRepaintOntoTile', () => {
    beforeEach(() => {
      const mockDrawImage = vi.fn()
      const mockFillRect = vi.fn()
      const mockToDataURL = vi.fn().mockReturnValue('data:image/png;base64,mockedCompositedBase64')

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({
          drawImage: mockDrawImage,
          fillRect: mockFillRect,
        }),
        toDataURL: mockToDataURL,
      }

      if (typeof globalThis.document === 'undefined') {
        Object.defineProperty(globalThis, 'document', {
          value: {
            createElement: vi.fn().mockReturnValue(mockCanvas),
          },
          writable: true,
        })
      } else {
        Object.defineProperty(document, 'createElement', {
          value: vi.fn().mockReturnValue(mockCanvas),
          writable: true,
        })
      }
    })

    it('returns null if tile does not overlap bounds', async () => {
      const result = await compositeRepaintOntoTile({
        tileX: 5,
        tileY: 5,
        tileSize: 512,
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        repaintImg: new Image(),
        scaleX: 1,
        scaleY: 1,
        existingTile: undefined,
        projectId: 'proj-1',
      })

      expect(result).toBeNull()
    })

    it('composites overlap onto new tile canvas and returns base64 payload', async () => {
      const result = await compositeRepaintOntoTile({
        tileX: 0,
        tileY: 0,
        tileSize: 512,
        bounds: { x: 50, y: 50, width: 200, height: 200 },
        repaintImg: new Image(),
        scaleX: 1,
        scaleY: 1,
        existingTile: undefined,
        projectId: 'proj-1',
      })

      expect(result).toBe('mockedCompositedBase64')
    })

    it('composites overlap with existing tile without throwing', async () => {
      const existingTile: Tile = {
        id: 't-exist',
        project_id: 'proj-1',
        x: 0,
        y: 0,
        tile_prompt: 'Existing grass',
        image_filename: null,
        created_at: '2026-08-01T00:00:00Z',
      }

      const result = await compositeRepaintOntoTile({
        tileX: 0,
        tileY: 0,
        tileSize: 512,
        bounds: { x: 0, y: 0, width: 512, height: 512 },
        repaintImg: new Image(),
        scaleX: 1,
        scaleY: 1,
        existingTile,
        projectId: 'proj-1',
      })

      expect(result).toBe('mockedCompositedBase64')
    })
  })
})
