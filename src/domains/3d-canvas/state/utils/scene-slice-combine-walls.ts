import { v4 as uuidv4 } from 'uuid'
import type { Surface, Wall } from '../../core/interior-types'
import { SCENE_SURFACE_TYPE_ROAD } from '../../constants/scene-slice-log'

type WallSegment = {
  id: string
  p1: [number, number, number]
  p2: [number, number, number]
  used: boolean
}

function isSamePoint(
  p1: [number, number, number],
  p2: [number, number, number]
): boolean {
  return Math.abs(p1[0] - p2[0]) < 0.2 && Math.abs(p1[2] - p2[2]) < 0.2
}

function coordKey(p: number[]): string {
  return `${p[0].toFixed(2)},${p[2].toFixed(2)}`
}

function buildPointCounts(segments: WallSegment[]): Map<string, number> {
  const pointCounts = new Map<string, number>()
  for (const segment of segments) {
    const k1 = coordKey(segment.p1)
    pointCounts.set(k1, (pointCounts.get(k1) || 0) + 1)
    const k2 = coordKey(segment.p2)
    pointCounts.set(k2, (pointCounts.get(k2) || 0) + 1)
  }
  return pointCounts
}

function orderWallSegments(
  segments: WallSegment[],
  pointCounts: Map<string, number>
): [number, number, number][] {
  const startSeg =
    segments.find(
      s => pointCounts.get(coordKey(s.p1)) === 1 || pointCounts.get(coordKey(s.p2)) === 1
    ) ?? segments[0]
  if (!startSeg) return []

  let currentSeg = startSeg
  const orderedPoints: [number, number, number][] = []

  let currentPoint =
    pointCounts.get(coordKey(currentSeg.p1)) === 1 ? currentSeg.p1 : currentSeg.p2
  if (
    pointCounts.get(coordKey(currentSeg.p1)) !== 1 &&
    pointCounts.get(coordKey(currentSeg.p2)) !== 1
  ) {
    currentPoint = currentSeg.p1
  }

  orderedPoints.push(currentPoint)

  let count = 0
  while (count < segments.length) {
    const otherEnd = isSamePoint(currentSeg.p1, currentPoint) ? currentSeg.p2 : currentSeg.p1
    orderedPoints.push(otherEnd)
    currentSeg.used = true
    count++

    const nextSeg = segments.find(
      s => !s.used && (isSamePoint(s.p1, otherEnd) || isSamePoint(s.p2, otherEnd))
    )
    if (!nextSeg) break

    currentSeg = nextSeg
    currentPoint = otherEnd
  }

  return orderedPoints
}

function dedupeOrderedPoints(
  orderedPoints: [number, number, number][]
): [number, number, number][] {
  const uniquePoints: [number, number, number][] = []
  if (orderedPoints.length > 0) uniquePoints.push(orderedPoints[0])
  for (let i = 1; i < orderedPoints.length; i++) {
    if (!isSamePoint(orderedPoints[i], orderedPoints[i - 1])) {
      uniquePoints.push(orderedPoints[i])
    }
  }
  return uniquePoints
}

export function partitionWallsBySelection(
  walls: Wall[],
  selectedIds: string[]
): { selectedWalls: Wall[]; remainingWalls: Wall[] } {
  const selectedWalls: Wall[] = []
  const remainingWalls: Wall[] = []
  const selectedSet = new Set(selectedIds)

  for (const wall of walls) {
    if (selectedSet.has(wall.id)) {
      selectedWalls.push(wall)
    } else {
      remainingWalls.push(wall)
    }
  }

  return { selectedWalls, remainingWalls }
}

export function buildRoadSurfaceFromWalls(
  selectedWalls: Wall[],
  roundness?: number
): Surface | null {
  if (selectedWalls.length < 2) return null

  const segments: WallSegment[] = selectedWalls.map(w => ({
    id: w.id,
    p1: w.start,
    p2: w.end,
    used: false,
  }))

  const pointCounts = buildPointCounts(segments)
  const orderedPoints = orderWallSegments(segments, pointCounts)
  const uniquePoints = dedupeOrderedPoints(orderedPoints)

  if (uniquePoints.length < 2) return null

  return {
    id: uuidv4(),
    type: SCENE_SURFACE_TYPE_ROAD,
    points: uniquePoints,
    isPath: true,
    curved: true,
    width: selectedWalls[0].thickness || 0.5,
    height: selectedWalls[0].height || 3,
    isVertical: true,
    roundness: roundness ?? 0.2,
    texture: selectedWalls[0].texture,
    layerIndex: 10,
    metalness: 0,
    roughness: 0.8,
  }
}
