import type { Tile } from '@/shared/data/world-tile'

export interface TileContext {
  targetX: number
  targetY: number
  neighbors: {
    up?: Tile & { imageUrl?: string }
    down?: Tile & { imageUrl?: string }
    left?: Tile & { imageUrl?: string }
    right?: Tile & { imageUrl?: string }
    topLeft?: Tile & { imageUrl?: string }
    topRight?: Tile & { imageUrl?: string }
    bottomLeft?: Tile & { imageUrl?: string }
    bottomRight?: Tile & { imageUrl?: string }
  }
  styleReferenceUrls?: string[]
  // We might need the full tiles map for more complex context later
  allTiles: Record<string, Tile>
}

