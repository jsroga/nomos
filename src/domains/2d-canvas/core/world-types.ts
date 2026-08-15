import type { WorldAsset, WorldProject, WorldTile } from './io/world.dto'
import { readNumber, recordFromJson } from '@/shared/data/json-guards'
import type { Tile } from '@/shared/data/world-tile'
import type { WorkspaceProject } from '@/shared/workspace/types'

export type { Tile } from '@/shared/data/world-tile'

export type Project = WorkspaceProject

export type Asset = {
  id: string
  project_id: string
  image_filename: string
  model_filename?: string | null
  created_at: string
  metadata: {
    bounds?: { x: number; y: number; width: number; height: number }
    box?: { x1: number; y1: number; x2: number; y2: number }
  }
}

export function toLegacyTile(tile: WorldTile): Tile {
  return {
    id: tile.id,
    project_id: tile.projectId,
    x: tile.x,
    y: tile.y,
    tile_prompt: tile.tilePrompt,
    image_filename: tile.imageFilename,
    created_at: tile.createdAt ?? new Date().toISOString(),
  }
}

export function toLegacyProject(project: WorldProject): Project {
  return {
    id: project.id,
    name: project.name,
    user_id: project.userId,
    master_prompt: project.masterPrompt,
    series_bible: project.seriesBible,
    story_plan: project.storyPlan,
    stylePreset: project.stylePreset ?? null,
    generationMode: project.generationMode ?? null,
    styleAnchorUrl: project.styleAnchorUrl ?? null,
    description: project.description,
    created_at: project.createdAt,
  }
}

export function toLegacyAsset(asset: WorldAsset): Asset {
  const metadata = recordFromJson(asset.metadata)
  const boundsRecord = recordFromJson(metadata.bounds)
  const boxRecord = recordFromJson(metadata.box)
  const legacyMetadata: Asset['metadata'] = {}

  const boundsX = readNumber(boundsRecord.x)
  const boundsY = readNumber(boundsRecord.y)
  const boundsWidth = readNumber(boundsRecord.width)
  const boundsHeight = readNumber(boundsRecord.height)
  if (
    boundsX !== undefined &&
    boundsY !== undefined &&
    boundsWidth !== undefined &&
    boundsHeight !== undefined
  ) {
    legacyMetadata.bounds = {
      x: boundsX,
      y: boundsY,
      width: boundsWidth,
      height: boundsHeight,
    }
  }

  const boxX1 = readNumber(boxRecord.x1)
  const boxY1 = readNumber(boxRecord.y1)
  const boxX2 = readNumber(boxRecord.x2)
  const boxY2 = readNumber(boxRecord.y2)
  if (
    boxX1 !== undefined &&
    boxY1 !== undefined &&
    boxX2 !== undefined &&
    boxY2 !== undefined
  ) {
    legacyMetadata.box = { x1: boxX1, y1: boxY1, x2: boxX2, y2: boxY2 }
  }

  return {
    id: asset.id,
    project_id: asset.projectId,
    image_filename: asset.imageFilename,
    model_filename: asset.modelFilename,
    created_at: asset.createdAt ?? new Date().toISOString(),
    metadata: legacyMetadata,
  }
}

export function tilesToMap(tiles: WorldTile[]): Record<string, Tile> {
  const map: Record<string, Tile> = {}
  for (const tile of tiles) {
    map[`${tile.x},${tile.y}`] = toLegacyTile(tile)
  }
  return map
}
