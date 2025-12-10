import { Wall } from '../store/useInteriorStore'

/**
 * Point represented as [x, z] (ignoring y for 2D floor plan)
 */
type Point2D = [number, number]

const EPSILON = 0.01 // Tolerance for point comparison

function pointsEqual(p1: Point2D, p2: Point2D): boolean {
    return Math.abs(p1[0] - p2[0]) < EPSILON && Math.abs(p1[1] - p2[1]) < EPSILON
}

/**
 * Build an adjacency map from walls for graph traversal
 */
function buildAdjacencyMap(walls: Wall[]): Map<string, Set<string>> {
    const adj = new Map<string, Set<string>>()

    const pointKey = (p: Point2D): string => `${p[0].toFixed(2)},${p[1].toFixed(2)}`

    for (const wall of walls) {
        const startKey = pointKey([wall.start[0], wall.start[2]])
        const endKey = pointKey([wall.end[0], wall.end[2]])

        if (!adj.has(startKey)) adj.set(startKey, new Set())
        if (!adj.has(endKey)) adj.set(endKey, new Set())

        adj.get(startKey)!.add(endKey)
        adj.get(endKey)!.add(startKey)
    }

    return adj
}

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

        adj.get(startKey)!.push(endKey)
        adj.get(endKey)!.push(startKey)
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
        const current = queue.shift()!

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

/**
 * Check if adding a wall would close a polygon
 * Simpler version: just check if the end point matches any other wall's start/end
 * that eventually connects back to the start point
 */
export function wouldClosePolygon(
    walls: Wall[],
    newStart: [number, number, number],
    newEnd: [number, number, number]
): boolean {
    if (walls.length < 2) return false

    const pointKey = (x: number, z: number): string => `${x.toFixed(2)},${z.toFixed(2)}`

    // Build adjacency map from existing walls
    const adj = buildAdjacencyMap(walls)

    const startKey = pointKey(newStart[0], newStart[2])
    const endKey = pointKey(newEnd[0], newEnd[2])

    // Check if both start and end connect to existing walls
    const startConnected = adj.has(startKey)
    const endConnected = adj.has(endKey)

    if (!startConnected || !endConnected) return false

    // Check if there's a path from start to end through existing walls
    const visited = new Set<string>()

    function canReach(current: string, target: string): boolean {
        if (current === target) return true
        if (visited.has(current)) return false

        visited.add(current)
        const neighbors = adj.get(current) || new Set()

        for (const neighbor of neighbors) {
            if (canReach(neighbor, target)) return true
        }

        return false
    }

    // The new wall would close a polygon if the end point can reach the start point
    // through existing walls
    return canReach(endKey, startKey)
}
