import type { Wall } from './interior-types'

/**
 * Find closed polygon when a new wall completes a shape.
 * Only returns a polygon if the new wall actually closes a loop.
 */
export function findClosedPolygons(
  walls: Wall[],
  newWallStart: [number, number, number],
  newWallEnd: [number, number, number]
): [number, number, number][] | null {
  // We need at least 2 existing walls + the new wall to form a closed polygon (3 walls minimum)
  if (walls.length < 2) return null

  const pointKey = (x: number, z: number): string => `${x.toFixed(2)},${z.toFixed(2)}`
  const parseKey = (key: string): [number, number] => {
    const [x, z] = key.split(',').map(Number)
    return [x, z]
  }

  const newStartKey = pointKey(newWallStart[0], newWallStart[2])
  const newEndKey = pointKey(newWallEnd[0], newWallEnd[2])

  // Build adjacency map from EXISTING walls only (not including new wall)
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

  // The new wall connects newWallStart -> newWallEnd
  // For a closed polygon: there must be a path from newWallEnd to newWallStart
  // through existing walls

  // Check if both endpoints of the new wall connect to existing walls
  if (!adj.has(newStartKey) || !adj.has(newEndKey)) {
    return null
  }

  // BFS to find shortest path from newEndKey back to newStartKey through existing walls
  const visited = new Map<string, string | null>() // Maps node to parent
  const queue: string[] = [newEndKey]
  visited.set(newEndKey, null)

  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined) break

    if (current === newStartKey && visited.size > 2) {
      // Found a path! Reconstruct it
      const path: string[] = []
      let node: string | null = current
      while (node !== null) {
        path.unshift(node)
        node = visited.get(node) ?? null
      }

      // Convert to 3D points
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
