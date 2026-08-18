import { describe, expect, it } from 'vitest'
import {
  cardinalCount,
  isApiframeGenerateAspectRatio,
  neighborCount,
  neighborPresenceFromLoaded,
  packedAspectRatio,
  packedCanvasLayout,
  packedCropSpecFromLayout,
  PACKED_NEIGHBOR_KEYS,
  PACKED_TILE_SIZE,
  PackedNeighborSlot,
  tightPackedCanvasLayout,
  type NeighborPresence,
  type PackedCanvasLayout,
} from '../context-pack-layout'

const TILE = PACKED_TILE_SIZE
const L = PackedNeighborSlot.Left
const R = PackedNeighborSlot.Right
const U = PackedNeighborSlot.Up
const D = PackedNeighborSlot.Down
const TL = PackedNeighborSlot.TopLeft
const TR = PackedNeighborSlot.TopRight
const BL = PackedNeighborSlot.BottomLeft
const BR = PackedNeighborSlot.BottomRight

function presence(...slots: PackedNeighborSlot[]): NeighborPresence {
  const loaded: Partial<Record<PackedNeighborSlot, true>> = {}
  for (const slot of slots) loaded[slot] = true
  return neighborPresenceFromLoaded(loaded)
}

function placedSlots(layout: PackedCanvasLayout): PackedNeighborSlot[] {
  return PACKED_NEIGHBOR_KEYS.filter(key => layout[key] !== undefined)
}

function destOverlapsHole(layout: PackedCanvasLayout, slot: PackedNeighborSlot): boolean {
  const dest = layout[slot]
  if (!dest) return false
  const hole = layout.hole
  return (
    dest.x < hole.x + hole.width &&
    dest.x + TILE > hole.x &&
    dest.y < hole.y + hole.height &&
    dest.y + TILE > hole.y
  )
}

interface OccupancyCase {
  name: string
  slots: PackedNeighborSlot[]
  width: number
  height: number
  holeX: number
  holeY: number
}

const OCCUPANCY_CASES: OccupancyCase[] = [
  { name: 'empty', slots: [], width: 512, height: 512, holeX: 0, holeY: 0 },
  { name: 'left', slots: [L], width: 1024, height: 512, holeX: 512, holeY: 0 },
  { name: 'right', slots: [R], width: 1024, height: 512, holeX: 0, holeY: 0 },
  { name: 'up', slots: [U], width: 512, height: 1024, holeX: 0, holeY: 512 },
  { name: 'down', slots: [D], width: 512, height: 1024, holeX: 0, holeY: 0 },
  { name: 'topLeft', slots: [TL], width: 1024, height: 1024, holeX: 512, holeY: 512 },
  { name: 'topRight', slots: [TR], width: 1024, height: 1024, holeX: 0, holeY: 512 },
  { name: 'bottomLeft', slots: [BL], width: 1024, height: 1024, holeX: 512, holeY: 0 },
  { name: 'bottomRight', slots: [BR], width: 1024, height: 1024, holeX: 0, holeY: 0 },
  { name: '2x2 left-down-BL', slots: [L, D, BL], width: 1024, height: 1024, holeX: 512, holeY: 0 },
  { name: '2x2 left-up-TL', slots: [L, U, TL], width: 1024, height: 1024, holeX: 512, holeY: 512 },
  { name: '2x2 right-up-TR', slots: [R, U, TR], width: 1024, height: 1024, holeX: 0, holeY: 512 },
  { name: '2x2 right-down-BR', slots: [R, D, BR], width: 1024, height: 1024, holeX: 0, holeY: 0 },
  { name: 'left+BL no down', slots: [L, BL], width: 1024, height: 1024, holeX: 512, holeY: 0 },
  { name: 'left+TL no up', slots: [L, TL], width: 1024, height: 1024, holeX: 512, holeY: 512 },
  { name: 'right+BR no down', slots: [R, BR], width: 1024, height: 1024, holeX: 0, holeY: 0 },
  { name: 'right+TR no up', slots: [R, TR], width: 1024, height: 1024, holeX: 0, holeY: 512 },
  { name: 'up+TL no left', slots: [U, TL], width: 1024, height: 1024, holeX: 512, holeY: 512 },
  { name: 'up+TR no right', slots: [U, TR], width: 1024, height: 1024, holeX: 0, holeY: 512 },
  { name: 'down+BL no left', slots: [D, BL], width: 1024, height: 1024, holeX: 512, holeY: 0 },
  { name: 'down+BR no right', slots: [D, BR], width: 1024, height: 1024, holeX: 0, holeY: 0 },
  { name: 'L left+down', slots: [L, D], width: 1024, height: 1024, holeX: 512, holeY: 0 },
  { name: 'L left+up', slots: [L, U], width: 1024, height: 1024, holeX: 512, holeY: 512 },
  { name: 'L right+down', slots: [R, D], width: 1024, height: 1024, holeX: 0, holeY: 0 },
  { name: 'L right+up', slots: [R, U], width: 1024, height: 1024, holeX: 0, holeY: 512 },
  { name: 'opposite left+right', slots: [L, R], width: 1536, height: 512, holeX: 512, holeY: 0 },
  { name: 'opposite up+down', slots: [U, D], width: 512, height: 1536, holeX: 0, holeY: 512 },
  { name: 'U left+right+up', slots: [L, R, U], width: 1536, height: 1024, holeX: 512, holeY: 512 },
  { name: 'U left+right+down', slots: [L, R, D], width: 1536, height: 1024, holeX: 512, holeY: 0 },
  { name: 'U left+up+down', slots: [L, U, D], width: 1024, height: 1536, holeX: 512, holeY: 512 },
  { name: 'U right+up+down', slots: [R, U, D], width: 1024, height: 1536, holeX: 0, holeY: 512 },
  { name: 'plus four cardinals', slots: [L, R, U, D], width: 1536, height: 1536, holeX: 512, holeY: 512 },
  { name: 'top pair TL+TR', slots: [TL, TR], width: 1536, height: 1024, holeX: 512, holeY: 512 },
  { name: 'bottom pair BL+BR', slots: [BL, BR], width: 1536, height: 1024, holeX: 512, holeY: 0 },
  { name: 'left pair TL+BL', slots: [TL, BL], width: 1024, height: 1536, holeX: 512, holeY: 512 },
  { name: 'right pair TR+BR', slots: [TR, BR], width: 1024, height: 1536, holeX: 0, holeY: 512 },
  { name: 'diag TL+BR', slots: [TL, BR], width: 1536, height: 1536, holeX: 512, holeY: 512 },
  { name: 'diag TR+BL', slots: [TR, BL], width: 1536, height: 1536, holeX: 512, holeY: 512 },
  { name: 'left+right+TL', slots: [L, R, TL], width: 1536, height: 1024, holeX: 512, holeY: 512 },
  { name: 'left column L+TL+BL', slots: [L, TL, BL], width: 1024, height: 1536, holeX: 512, holeY: 512 },
  { name: 'right column R+TR+BR', slots: [R, TR, BR], width: 1024, height: 1536, holeX: 0, holeY: 512 },
  { name: 'top row U+TL+TR', slots: [U, TL, TR], width: 1536, height: 1024, holeX: 512, holeY: 512 },
  { name: 'bottom row D+BL+BR', slots: [D, BL, BR], width: 1536, height: 1024, holeX: 512, holeY: 0 },
  { name: 'four corners', slots: [TL, TR, BL, BR], width: 1536, height: 1536, holeX: 512, holeY: 512 },
  { name: 'three corners TL+TR+BL', slots: [TL, TR, BL], width: 1536, height: 1536, holeX: 512, holeY: 512 },
  { name: 'plus + TL', slots: [L, R, U, D, TL], width: 1536, height: 1536, holeX: 512, holeY: 512 },
  { name: 'seven missing BR', slots: [L, R, U, D, TL, TR, BL], width: 1536, height: 1536, holeX: 512, holeY: 512 },
  { name: 'all eight', slots: [L, R, U, D, TL, TR, BL, BR], width: 1536, height: 1536, holeX: 512, holeY: 512 },
  { name: 'left+right+BL+BR', slots: [L, R, BL, BR], width: 1536, height: 1024, holeX: 512, holeY: 0 },
  { name: 'up+down+TL+TR', slots: [U, D, TL, TR], width: 1536, height: 1536, holeX: 512, holeY: 512 },
]

describe('packed 8-neighbor occupancy matrix', () => {
  it('locks fifty occupancy cases', () => {
    expect(OCCUPANCY_CASES).toHaveLength(50)
  })

  it.each(OCCUPANCY_CASES)('$name is $width×$height hole ($holeX,$holeY)', ({
    slots,
    width,
    height,
    holeX,
    holeY,
  }) => {
    const flags = presence(...slots)
    const layout = tightPackedCanvasLayout(flags)
    expect(layout.width).toBe(width)
    expect(layout.height).toBe(height)
    expect(layout.cellSize).toBe(TILE)
    expect(layout.hole).toEqual({ x: holeX, y: holeY, width: TILE, height: TILE })
    expect(placedSlots(layout)).toEqual(
      PACKED_NEIGHBOR_KEYS.filter(key => slots.includes(key)),
    )
    expect(neighborCount(flags)).toBe(slots.length)
    for (const slot of slots) {
      expect(destOverlapsHole(layout, slot)).toBe(false)
    }
    const sent = packedCanvasLayout(flags)
    expect(isApiframeGenerateAspectRatio(packedAspectRatio(sent.width, sent.height))).toBe(true)
    expect(packedCropSpecFromLayout(layout)).toEqual({
      cropRect: layout.hole,
      packedWidth: layout.width,
      packedHeight: layout.height,
    })
  })

  it('does not count diagonals as cardinals', () => {
    expect(cardinalCount(presence(TL, TR, BL, BR))).toBe(0)
    expect(cardinalCount(presence(L, D, BL))).toBe(2)
  })
})
