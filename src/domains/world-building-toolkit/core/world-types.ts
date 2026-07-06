import type { WorldAsset, WorldProject, WorldTile } from '../io/world.dto'

/** Legacy snake_case tile shape used by existing UI code */
export type Tile = {
  id: string
  project_id: string
  x: number
  y: number
  tile_prompt: string | null
  image_filename: string | null
  created_at: string
}

export type Project = {
  id: string
  name: string
  user_id?: string
  master_prompt: string
  series_bible: Record<string, unknown>
  story_plan: Record<string, unknown>
  description?: string | null
  created_at?: string
}

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
    description: project.description,
    created_at: project.createdAt,
  }
}

export function toLegacyAsset(asset: WorldAsset): Asset {
  return {
    id: asset.id,
    project_id: asset.projectId,
    image_filename: asset.imageFilename,
    model_filename: asset.modelFilename,
    created_at: asset.createdAt ?? new Date().toISOString(),
    metadata: asset.metadata as Asset['metadata'],
  }
}

export function tilesToMap(tiles: WorldTile[]): Record<string, Tile> {
  const map: Record<string, Tile> = {}
  for (const tile of tiles) {
    map[`${tile.x},${tile.y}`] = toLegacyTile(tile)
  }
  return map
}
