import { TileIdPrefix } from '../../constants/tile-generation-service'
import { toLegacyTile, type Tile } from '../../core/world-types'
import type { WorldTile } from '../../core/io/world.dto'

export function tileAfterGenerationAccept(input: {
  existing: Tile | undefined
  persisted: WorldTile | null
  projectId: string
  x: number
  y: number
  imageUrl: string
}): Tile {
  const { existing, persisted, projectId, x, y, imageUrl } = input
  const fromApi = persisted ? toLegacyTile(persisted) : undefined
  return {
    id: fromApi?.id ?? existing?.id ?? `${TileIdPrefix.Tile}${x}-${y}`,
    project_id: fromApi?.project_id ?? existing?.project_id ?? projectId,
    x,
    y,
    tile_prompt: existing?.tile_prompt ?? fromApi?.tile_prompt ?? null,
    image_filename: fromApi?.image_filename || imageUrl,
    created_at: fromApi?.created_at ?? existing?.created_at ?? new Date().toISOString(),
  }
}
