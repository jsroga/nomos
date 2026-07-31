import React, { memo, useMemo } from 'react'
import { Tile } from './Tile'
import { TILE_COORD_SEPARATOR } from '@/domains/world-building-toolkit/ui/constants/tile-stage-labels'
import { WORLD_CANVAS_ORIGIN_TILE_COORD } from './constants/world-canvas'
import type { Tile as TileType } from '@/domains/world-building-toolkit/core/world-types'
import { useWorldStore } from '@/domains/world-building-toolkit'

export const TILE_SIZE = 512

/** Extra tiles beyond the viewport so pan feels continuous. */
const VIEWPORT_CULL_MARGIN_TILES = 2

function collectNeighborKeys(tiles: Record<string, TileType>): Set<string> {
  const knownCoords = new Set(Object.keys(tiles))
  const potentialNeighbors = new Set<string>()

  Object.values(tiles).forEach(tile => {
    ;[
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ].forEach(([dx, dy]) => {
      const key = `${tile.x + dx}${TILE_COORD_SEPARATOR}${tile.y + dy}`
      if (!knownCoords.has(key)) {
        potentialNeighbors.add(key)
      }
    })
  })

  if (Object.keys(tiles).length === 0) {
    potentialNeighbors.add(WORLD_CANVAS_ORIGIN_TILE_COORD)
  }

  return potentialNeighbors
}

function isTileNearViewport(
  x: number,
  y: number,
  viewport: { x: number; y: number; scale: number },
  viewW: number,
  viewH: number
): boolean {
  const scale = viewport.scale || 1
  // World origin is at screen center; tile top-left in screen space:
  const screenX = viewport.x + x * TILE_SIZE * scale
  const screenY = viewport.y + y * TILE_SIZE * scale
  const tileScreen = TILE_SIZE * scale
  const margin = VIEWPORT_CULL_MARGIN_TILES * tileScreen

  const left = -viewW / 2 - margin
  const right = viewW / 2 + margin
  const top = -viewH / 2 - margin
  const bottom = viewH / 2 + margin

  return (
    screenX + tileScreen >= left &&
    screenX <= right &&
    screenY + tileScreen >= top &&
    screenY <= bottom
  )
}

export function renderWorldCanvasTiles(tiles: Record<string, TileType>): React.ReactNode[] {
  const renderedTiles: React.ReactNode[] = []
  const potentialNeighbors = collectNeighborKeys(tiles)

  Object.values(tiles).forEach(tile => {
    renderedTiles.push(
      <Tile key={`${tile.x}${TILE_COORD_SEPARATOR}${tile.y}`} x={tile.x} y={tile.y} size={TILE_SIZE} />
    )
  })

  potentialNeighbors.forEach(key => {
    const [x, y] = key.split(TILE_COORD_SEPARATOR).map(Number)
    renderedTiles.push(<Tile key={`empty-${x},${y}`} x={x} y={y} size={TILE_SIZE} />)
  })

  return renderedTiles
}

/** Subscribes to tiles + viewport; memo'd Tile children skip work when off-screen set stable. */
export const WorldCanvasTilesLayer = memo(function WorldCanvasTilesLayer({
  viewWidth,
  viewHeight,
}: {
  viewWidth: number
  viewHeight: number
}) {
  const tiles = useWorldStore(state => state.tiles)
  const viewport = useWorldStore(state => state.viewport)

  const nodes = useMemo(() => {
    const out: React.ReactNode[] = []
    const neighbors = collectNeighborKeys(tiles)

    Object.values(tiles).forEach(tile => {
      if (!isTileNearViewport(tile.x, tile.y, viewport, viewWidth, viewHeight)) return
      out.push(
        <Tile
          key={`${tile.x}${TILE_COORD_SEPARATOR}${tile.y}`}
          x={tile.x}
          y={tile.y}
          size={TILE_SIZE}
        />
      )
    })

    neighbors.forEach(key => {
      const [x, y] = key.split(TILE_COORD_SEPARATOR).map(Number)
      if (!isTileNearViewport(x, y, viewport, viewWidth, viewHeight)) return
      out.push(<Tile key={`empty-${x},${y}`} x={x} y={y} size={TILE_SIZE} />)
    })

    return out
  }, [tiles, viewport, viewWidth, viewHeight])

  return <>{nodes}</>
})
