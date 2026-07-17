import type { Wall } from './interior-types'

function pointKey(x: number, z: number): string {
  return `${x.toFixed(2)},${z.toFixed(2)}`
}

function parseKey(key: string): [number, number] {
  const [x, z] = key.split(',').map(Number)
  return [x, z]
}

function buildWallAdjacency(walls: Wall[]): Map<string, string[]> {
  const adj = new Map<string, string[]>()
  for (const wall of walls) {
    const startKey = pointKey(wall.start[0], wall.start[2])
    const endKey = pointKey(wall.end[0], wall.end[2])

    if (!adj.has(startKey)) adj.set(startKey, [])
    if (!adj.has(endKey)) adj.set(endKey, [])

    const startNeighbors = adj.get(startKey)
    const endNeighbors = adj.get(endKey)
    if (startNeighbors && endNeighbors) {
      startNeighbors.push(endKey)
      endNeighbors.push(startKey)
    }
  }
  return adj
}

function findClosingPath(
  adj: Map<string, string[]>,
  startKey: string,
  endKey: string,
): [number, number, number][] | null {
  const visited = new Map<string, string | null>()
  const queue: string[] = [endKey]
  visited.set(endKey, null)

  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined) break

    if (current === startKey && visited.size > 2) {
      const path: string[] = []
      let node: string | null = current
      while (node !== null) {
        path.unshift(node)
        node = visited.get(node) ?? null
      }

      const polygon: [number, number, number][] = path.map(key => {
        const [x, z] = parseKey(key)
        return [x, 0, z]
      })

      if (polygon.length >= 3) {
        return polygon
      }
    }

    const neighbors = adj.get(current) || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.set(neighbor, current)
        queue.push(neighbor)
      }
    }
  }

  return null
}

/**
 * Find closed polygon when a new wall completes a shape.
 * Only returns a polygon if the new wall actually closes a loop.
 */
export function findClosedPolygons(
  walls: Wall[],
  newWallStart: [number, number, number],
  newWallEnd: [number, number, number],
): [number, number, number][] | null {
  if (walls.length < 2) return null

  const newStartKey = pointKey(newWallStart[0], newWallStart[2])
  const newEndKey = pointKey(newWallEnd[0], newWallEnd[2])
  const adj = buildWallAdjacency(walls)

  if (!adj.has(newStartKey) || !adj.has(newEndKey)) {
    return null
  }

  return findClosingPath(adj, newStartKey, newEndKey)
}
