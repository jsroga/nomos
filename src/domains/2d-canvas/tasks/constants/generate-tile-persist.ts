import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { put } from '@vercel/blob'
import { logger } from '@trigger.dev/sdk/v3'
import { BufferEncoding, ContentType } from '@/shared/data/constants/protocol'
import { DB_COLUMN, DB_TABLE } from '@/shared/data/constants/db-tables'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { imageService } from '@/shared/data/server/image-service'
import type { GenerateTilePayload, TileNeighborsPayload } from './generate-tile'
import { CONTEXT_CANONICAL_VARIANT } from './generate-tile'
import type { PackedCropSpec } from '@/shared/ai/context-pack-layout'
import { assertTilePngSize } from './generate-tile-output'

const SUPABASE_SERVICE_ENV_MISSING =
  'SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for service-role writes'

export function extractContextImageBase64(payload: GenerateTilePayload): string | undefined {
  if (payload.contextImageBase64) {
    return payload.contextImageBase64
  }
  const contextPayload = payload.contextPayload
  if (!contextPayload?.images) {
    return undefined
  }
  const preferred = contextPayload.preferredVariant ?? CONTEXT_CANONICAL_VARIANT
  for (const [key, value] of Object.entries(contextPayload.images)) {
    if (key === preferred && typeof value === 'string') {
      return value
    }
  }
  const values = Object.values(contextPayload.images)
  return values.find((value): value is string => typeof value === 'string')
}

export async function assembleServerContextImage(
  x: number,
  y: number,
  neighbors: TileNeighborsPayload
): Promise<{ imageBase64: string; packedCrop: PackedCropSpec }> {
  logger.info('Assembling context image on server')
  const assembled = await imageService.assembleContext({
    targetX: x,
    targetY: y,
    neighbors,
    allTiles: {},
  })
  return {
    imageBase64: assembled.image.toString(BufferEncoding.Base64),
    packedCrop: {
      cropRect: assembled.cropRect,
      packedWidth: assembled.packedWidth,
      packedHeight: assembled.packedHeight,
    },
  }
}

export function requireBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN not configured')
  }
  return token
}

export async function uploadTileToBlob(
  projectId: string,
  x: number,
  y: number,
  generatedImageBase64: string
): Promise<{ filename: string; newUrl: string }> {
  const filename = `tiles/${projectId}/${x}_${y}_${Date.now()}.png`
  const base64Data = generatedImageBase64.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64Data, BufferEncoding.Base64)
  await assertTilePngSize(buffer)
  const blob = await put(filename, buffer, {
    access: 'public',
    token: requireBlobToken(),
    contentType: ContentType.Png,
  })
  logger.info('Image uploaded to Vercel Blob', { newUrl: blob.url })
  return { filename, newUrl: blob.url }
}

export function createSupabaseServiceClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  // No anon-key fallback: this client exists to bypass RLS, and silently
  // downgrading to the anon key turns a config error into a confusing write
  // failure deep inside a task.
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(SUPABASE_SERVICE_ENV_MISSING)
  }
  return createClient(supabaseUrl, supabaseKey)
}

export async function resolveOriginalTileUrl(
  supabase: SupabaseClient,
  projectId: string,
  x: number,
  y: number
): Promise<string | undefined> {
  const { data: existingTile } = await supabase
    .from('tiles')
    .select('image_filename')
    .eq('project_id', projectId)
    .eq('x', x)
    .eq('y', y)
    .single()

  if (!existingTile?.image_filename) {
    return undefined
  }
  if (existingTile.image_filename.startsWith('http')) {
    return existingTile.image_filename
  }
  return `/projects/${projectId}/${existingTile.image_filename}`
}

export async function persistStyleAnchorIfEmpty(
  supabase: SupabaseClient,
  projectId: string,
  imageUrl: string
): Promise<void> {
  const { data } = await supabase
    .from(DB_TABLE.PROJECTS)
    .select(DB_COLUMN.STYLE_ANCHOR_URL)
    .eq(DB_COLUMN.ID, projectId)
    .maybeSingle()
  if (readString(recordFromJson(data)[DB_COLUMN.STYLE_ANCHOR_URL])) return
  await supabase
    .from(DB_TABLE.PROJECTS)
    .update({ [DB_COLUMN.STYLE_ANCHOR_URL]: imageUrl })
    .eq(DB_COLUMN.ID, projectId)
    .is(DB_COLUMN.STYLE_ANCHOR_URL, null)
}
