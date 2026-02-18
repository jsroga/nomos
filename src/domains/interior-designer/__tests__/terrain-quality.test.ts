/**
 * Unit tests for Terrain Quality Presets
 * Phase 1: Quick Wins Optimization
 */

import { TERRAIN_QUALITY_RESOLUTION, TerrainQuality } from '../store/useInteriorStore'
import { describe, it, expect } from 'vitest'

describe('Terrain Quality Presets', () => {
  describe('TERRAIN_QUALITY_RESOLUTION', () => {
    it('should have low quality at 8 vertices per meter', () => {
      expect(TERRAIN_QUALITY_RESOLUTION.low).toBe(8)
    })

    it('should have medium quality at 16 vertices per meter', () => {
      expect(TERRAIN_QUALITY_RESOLUTION.medium).toBe(16)
    })

    it('should have high quality at 40 vertices per meter', () => {
      expect(TERRAIN_QUALITY_RESOLUTION.high).toBe(40)
    })

    it('should cover all TerrainQuality types', () => {
      const qualities: TerrainQuality[] = ['low', 'medium', 'high']
      qualities.forEach(quality => {
        expect(TERRAIN_QUALITY_RESOLUTION[quality]).toBeDefined()
        expect(typeof TERRAIN_QUALITY_RESOLUTION[quality]).toBe('number')
      })
    })
  })

  describe('Vertex count calculations', () => {
    const calculateVertexCount = (width: number, depth: number, quality: TerrainQuality) => {
      const resolution = TERRAIN_QUALITY_RESOLUTION[quality]
      const segmentsW = Math.max(1, Math.ceil(width * resolution))
      const segmentsD = Math.max(1, Math.ceil(depth * resolution))
      return (segmentsW + 1) * (segmentsD + 1)
    }

    it('should produce fewer vertices on low quality', () => {
      const width = 5,
        depth = 5
      const lowCount = calculateVertexCount(width, depth, 'low')
      const mediumCount = calculateVertexCount(width, depth, 'medium')
      const highCount = calculateVertexCount(width, depth, 'high')

      expect(lowCount).toBeLessThan(mediumCount)
      expect(mediumCount).toBeLessThan(highCount)
    })

    it('should produce reasonable vertex counts for 5x5 surface', () => {
      const width = 5,
        depth = 5
      // Low: 8 res * 5m = 40 segments + 1 = 41 per side, 41*41 = 1681
      // Medium: 16 res * 5m = 80 + 1 = 81, 81*81 = 6561
      // High: 40 res * 5m = 200 + 1 = 201, 201*201 = 40401

      expect(calculateVertexCount(width, depth, 'low')).toBe(41 * 41)
      expect(calculateVertexCount(width, depth, 'medium')).toBe(81 * 81)
      expect(calculateVertexCount(width, depth, 'high')).toBe(201 * 201)
    })
  })
})
