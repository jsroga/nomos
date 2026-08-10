import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { put } from '@vercel/blob'
import { logger } from '@trigger.dev/sdk/v3'
import { BufferEncoding, ContentType } from '@/shared/data/constants/protocol'
import { imageService } from '@/shared/data/server/image-service'
import type { GenerateTilePayload, TileNeighborsPayload } from './generate-tile'
import { CONTEXT_CANONICAL_VARIANT } from './generate-tile'

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
): Promise<string> {
  logger.info('Assembling context image on server')
  const { image } = await imageService.assembleContext(
    {
      targetX: x,
      targetY: y,
      neighbors,
      allTiles: {},
    },
    1024
  )
  return image.toString(BufferEncoding.Base64)
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
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables not configured')
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
