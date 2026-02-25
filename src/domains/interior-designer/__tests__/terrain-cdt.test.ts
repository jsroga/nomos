/**
 * Unit tests for CDT (Constrained Delaunay Triangulation) implementation
 * Phase 2: CDT Refactor
 */

import earcut from 'earcut'
import { describe, it, expect } from 'vitest'

describe('CDT Triangulation', () => {
  // Point-in-polygon test using ray casting algorithm (copied from implementation)
  const isPointInPolygon = (x: number, z: number, polygon: Array<[number, number]>): boolean => {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, zi] = polygon[i]
      const [xj, zj] = polygon[j]
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
        inside = !inside
      }
    }
    return inside
  }

  describe('point-in-polygon', () => {
    const square: Array<[number, number]> = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ]

    it('should detect point inside square', () => {
      expect(isPointInPolygon(2, 2, square)).toBe(true)
    })

    it('should detect point outside square', () => {
      expect(isPointInPolygon(5, 5, square)).toBe(false)
    })

    it('should evaluate point on left edge as inside (ray-casting behavior)', () => {
      expect(isPointInPolygon(0, 2, square)).toBe(true)
    })
  })

  describe('Steiner point generation', () => {
    const generateSteinerPoints = (
      polygon: Array<[number, number]>,
      spacing: number
    ): Array<[number, number]> => {
      const minX = Math.min(...polygon.map(p => p[0]))
      const maxX = Math.max(...polygon.map(p => p[0]))
      const minZ = Math.min(...polygon.map(p => p[1]))
      const maxZ = Math.max(...polygon.map(p => p[1]))

      const points: Array<[number, number]> = []
      for (let x = minX + spacing / 2; x < maxX; x += spacing) {
        for (let z = minZ + spacing / 2; z < maxZ; z += spacing) {
          if (isPointInPolygon(x, z, polygon)) {
            points.push([x, z])
          }
        }
      }
      return points
    }

    it('should generate Steiner points inside a square', () => {
      const square: Array<[number, number]> = [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
      ]
      const points = generateSteinerPoints(square, 0.5)

      expect(points.length).toBeGreaterThan(0)
      points.forEach(([x, z]) => {
        expect(isPointInPolygon(x, z, square)).toBe(true)
      })
    })

    it('should generate more points with smaller spacing', () => {
      const square: Array<[number, number]> = [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
      ]
      const coarse = generateSteinerPoints(square, 1)
      const fine = generateSteinerPoints(square, 0.5)

      expect(fine.length).toBeGreaterThan(coarse.length)
    })
  })

  describe('earcut triangulation', () => {
    it('should triangulate a square', () => {
      const vertices = [0, 0, 4, 0, 4, 4, 0, 4] // Flat array
      const indices = earcut(vertices)

      expect(indices.length).toBe(6) // 2 triangles * 3 vertices
    })

    it('should triangulate a more complex polygon', () => {
      // Pentagon
      const vertices = [
        2,
        0, // top
        4,
        1.5, // right-top
        3,
        4, // right-bottom
        1,
        4, // left-bottom
        0,
        1.5, // left-top
      ]
      const indices = earcut(vertices)

      // Pentagon = 3 triangles
      expect(indices.length).toBe(9)
    })

    it('should handle concave polygons', () => {
      // L-shape (concave)
      const vertices = [0, 0, 2, 0, 2, 1, 1, 1, 1, 2, 0, 2]
      const indices = earcut(vertices)

      // L-shape = 4 triangles
      expect(indices.length).toBe(12)
    })
  })
})
