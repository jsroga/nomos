import { TileNeighborEdge } from '@/shared/data/server/constants/generation-prompts'
import { UrlScheme } from '@/shared/data/constants/protocol'

export type NeighborImageUrls = Partial<Record<TileNeighborEdge, string>>

const CARDINAL_EDGES = [
  TileNeighborEdge.Left,
  TileNeighborEdge.Right,
  TileNeighborEdge.Up,
  TileNeighborEdge.Down,
] as const

function isHttpUrl(url: string | undefined): url is string {
  return typeof url === 'string' && url.startsWith(UrlScheme.Http)
}

export function orderedNeighborEdges(urls: NeighborImageUrls | undefined): TileNeighborEdge[] {
  if (!urls) return []
  return CARDINAL_EDGES.filter(edge => isHttpUrl(urls[edge]))
}

export function orderedNeighborHttpsUrls(urls: NeighborImageUrls | undefined): string[] {
  if (!urls) return []
  const result: string[] = []
  for (const edge of CARDINAL_EDGES) {
    const url = urls[edge]
    if (isHttpUrl(url)) result.push(url)
  }
  return result
}

export function neighborImageUrlsFromSides(input: {
  left?: string
  right?: string
  up?: string
  down?: string
}): NeighborImageUrls {
  const urls: NeighborImageUrls = {}
  if (isHttpUrl(input.left)) urls[TileNeighborEdge.Left] = input.left
  if (isHttpUrl(input.right)) urls[TileNeighborEdge.Right] = input.right
  if (isHttpUrl(input.up)) urls[TileNeighborEdge.Up] = input.up
  if (isHttpUrl(input.down)) urls[TileNeighborEdge.Down] = input.down
  return urls
}
