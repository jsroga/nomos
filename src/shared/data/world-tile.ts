/** Legacy snake_case tile shape used by world-gen UI and shared AI context. */
export type Tile = {
  id: string
  project_id: string
  x: number
  y: number
  tile_prompt: string | null
  image_filename: string | null
  created_at: string
}
