import { TileContext } from './types'

type NeighborCorner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
type NeighborEdge = 'top' | 'bottom' | 'left' | 'right'
type NeighborDirection = 'up' | 'down' | 'left' | 'right'

type SeamNeighbor = TileContext['neighbors']['up']
type DrawSmartCorner = (
  neighbor: SeamNeighbor,
  edge: NeighborEdge,
  sourceHalf: 'start' | 'end',
  destX: number,
  destY: number
) => Promise<void>

interface SmartSeamCornerParams {
  draw: DrawSmartCorner
  corners: Record<NeighborCorner, SeamNeighbor>
  edges: Record<NeighborDirection, SeamNeighbor>
  targetX: number
  targetY: number
  tileSize: number
}

async function applyHorizontalPriorityCorners(params: SmartSeamCornerParams): Promise<void> {
  const { draw, corners, edges, targetX, targetY, tileSize } = params
  const farX = targetX + tileSize
  const farY = targetY + tileSize

  if (!corners.topLeft?.imageUrl) await draw(edges.left, 'right', 'start', 0, 0)
  if (!corners.bottomLeft?.imageUrl) await draw(edges.left, 'right', 'end', 0, farY)
  if (!corners.topRight?.imageUrl) await draw(edges.right, 'left', 'start', farX, 0)
  if (!corners.bottomRight?.imageUrl) await draw(edges.right, 'left', 'end', farX, farY)
}

async function applyVerticalPriorityCorners(params: SmartSeamCornerParams): Promise<void> {
  const { draw, corners, edges, targetX, targetY, tileSize } = params
  const farX = targetX + tileSize
  const farY = targetY + tileSize

  if (!corners.topLeft?.imageUrl) await draw(edges.up, 'bottom', 'start', 0, 0)
  if (!corners.topRight?.imageUrl) await draw(edges.up, 'bottom', 'end', farX, 0)
  if (!corners.bottomLeft?.imageUrl) await draw(edges.down, 'top', 'start', 0, farY)
  if (!corners.bottomRight?.imageUrl) await draw(edges.down, 'top', 'end', farX, farY)
}

/**
 * Fill diagonal corners of a seam from priority edges when the true corner tile
 * is absent (smartSeamContext only).
 */
export async function applySmartSeamCorners(params: {
  mode: 'balanced' | 'horizontal_priority' | 'vertical_priority'
  draw: DrawSmartCorner
  corners: Record<NeighborCorner, SeamNeighbor>
  edges: Record<NeighborDirection, SeamNeighbor>
  targetX: number
  targetY: number
  tileSize: number
}): Promise<void> {
  if (params.mode === 'horizontal_priority') {
    await applyHorizontalPriorityCorners(params)
  }
  if (params.mode === 'vertical_priority') {
    await applyVerticalPriorityCorners(params)
  }
}

export type { DrawSmartCorner, NeighborCorner, NeighborDirection, NeighborEdge, SeamNeighbor }
