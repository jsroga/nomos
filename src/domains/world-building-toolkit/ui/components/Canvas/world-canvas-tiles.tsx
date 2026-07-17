import React from 'react'
import { Tile } from './Tile'
import { TILE_COORD_SEPARATOR } from '@/domains/world-building-toolkit/ui/constants/tile-stage-labels'
import { WORLD_CANVAS_ORIGIN_TILE_COORD } from './constants/world-canvas'
import type { Tile as TileType } from '@/domains/world-building-toolkit/core/world-types'

const TILE_SIZE = 512

export function renderWorldCanvasTiles(tiles: Record<string, TileType>): React.ReactNode[] {
  const renderedTiles: React.ReactNode[] = []
  const knownCoords = new Set(Object.keys(tiles))

  Object.values(tiles).forEach(tile => {
    renderedTiles.push(
      <Tile key={`${tile.x}${TILE_COORD_SEPARATOR}${tile.y}`} x={tile.x} y={tile.y} size={TILE_SIZE} />
    )
  })

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

  potentialNeighbors.forEach(key => {
    const [x, y] = key.split(TILE_COORD_SEPARATOR).map(Number)
    renderedTiles.push(<Tile key={`empty-${x},${y}`} x={x} y={y} size={TILE_SIZE} />)
  })

  return renderedTiles
}
