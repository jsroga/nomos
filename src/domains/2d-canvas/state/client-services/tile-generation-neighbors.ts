import type { Tile } from '../../core/world-types'
import { UrlScheme } from '../../constants/tile-generation-service'

export interface NeighborUrls {
  up?: string
  down?: string
  left?: string
  right?: string
  topLeft?: string
  topRight?: string
  bottomLeft?: string
  bottomRight?: string
}

export function buildNeighborUrls(
  projectId: string,
  x: number,
  y: number,
  tiles: Record<string, Tile>
): { neighborUrls: NeighborUrls; hasNeighbors: boolean } {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const toAbsoluteUrl = (tile: Tile | undefined) => {
    if (!tile?.image_filename) return undefined
    return tile.image_filename.startsWith(UrlScheme.Http)
      ? tile.image_filename
      : `${origin}/projects/${projectId}/${tile.image_filename}`
  }

  const neighborUrls: NeighborUrls = {
    up: toAbsoluteUrl(tiles[`${x},${y - 1}`]),
    down: toAbsoluteUrl(tiles[`${x},${y + 1}`]),
    left: toAbsoluteUrl(tiles[`${x - 1},${y}`]),
    right: toAbsoluteUrl(tiles[`${x + 1},${y}`]),
    topLeft: toAbsoluteUrl(tiles[`${x - 1},${y - 1}`]),
    topRight: toAbsoluteUrl(tiles[`${x + 1},${y - 1}`]),
    bottomLeft: toAbsoluteUrl(tiles[`${x - 1},${y + 1}`]),
    bottomRight: toAbsoluteUrl(tiles[`${x + 1},${y + 1}`]),
  }

  const hasNeighbors = Object.values(neighborUrls).some(Boolean)

  return { neighborUrls, hasNeighbors }
}
