import { z } from 'zod'
import { OWNED_PAYLOAD_SHAPE } from '@/shared/jobs/submission-nonce'
import { env } from '@/shared/config/env'
import { logger, metadata } from '@trigger.dev/sdk'
import { put } from '@vercel/blob'
import {
  readApiframeApiKey,
  resolveFidelityEngine,
  resolveFidelityModel,
  resolveImageFidelityMode,
} from '@/shared/ai/image-model-env'
import { FidelityEngine } from '@/shared/ai/constants/image-env'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { TileProgressStage } from '../constants/fidelity-service'
import {
  BufferEncoding,
  BlobAccess,
  ContentType,
  UrlScheme,
} from '@/shared/data/constants/protocol'
import { createSupabaseServiceClient } from './constants/generate-tile-persist'
import { DB_COLUMN, DB_SELECT, DB_TABLE } from '@/shared/data/constants/db-tables'
import {
  generationModeDef,
  resolveGenerationMode,
} from '../constants/generation-modes'
import { topazEnhanceModelFromFidelityMode } from '../constants/topaz-upscale'
import { upscaleWithApiframe } from './upscale-tile-apiframe-provider'
import { ApiframeTopazUpscaleFactor } from '@/shared/ai/constants/apiframe'
import { enhanceFidelityWithGenerate } from './enhance-fidelity-generate'

export enum EnhanceFidelityError {
  NotAllowedForMode = 'Fidelity enhancement is not allowed for this generation mode',
}

export const enhanceFidelityPayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  tileId: z.string().min(1),
  imageBase64: z.string().min(1),
  stylePrompt: z.string(),
  creativity: z.number(),
  styleReferenceUrls: z.array(z.string()).optional(),
})

export type EnhanceFidelityPayload = z.infer<typeof enhanceFidelityPayloadSchema>

export async function runEnhanceFidelity(payload: EnhanceFidelityPayload) {
  const { tileId, projectId, imageBase64 } = payload

  const supabase = createSupabaseServiceClient()
  const { data: projectRow } = await supabase
    .from(DB_TABLE.PROJECTS)
    .select(DB_SELECT.PROJECT_STYLE_REFS)
    .eq(DB_COLUMN.ID, projectId)
    .single()
  const mode = generationModeDef(resolveGenerationMode(projectRow?.generation_mode))
  if (!mode.allowsFidelityEnhance) {
    throw new Error(EnhanceFidelityError.NotAllowedForMode)
  }

  const apiKey = readApiframeApiKey()
  if (!apiKey) {
    throw new Error(API_ERROR.APIFRAME_API_KEY_NOT_PROVIDED)
  }

  const engine = resolveFidelityEngine()
  logger.info(`Starting fidelity enhancement for tile ${tileId}`, {
    projectId,
    engine,
  })

  await metadata.set('progress', 0)
  await metadata.set('stage', TileProgressStage.Initializing)
  await metadata.set('tile_id', tileId)

  await metadata.set('stage', TileProgressStage.Enhancing)
  await metadata.set('progress', 30)

  const sourceImageUrl =
    engine === FidelityEngine.Topaz
      ? await enhanceFidelityWithTopaz(imageBase64, apiKey)
      : await enhanceFidelityWithGenerate({
          apiKey,
          model: resolveFidelityModel(),
          imageBase64,
          stylePrompt: payload.stylePrompt,
          creativity: payload.creativity,
          styleReferenceUrls: payload.styleReferenceUrls,
        })
  const enhancedImageBase64 = await downloadImageAsBase64(sourceImageUrl)
  logger.info('Fidelity enhancement completed', {
    imageLength: enhancedImageBase64.length,
    engine,
  })

  await metadata.set('progress', 70)
  await metadata.set('stage', TileProgressStage.Uploading)

  const timestamp = Date.now()
  const filename = `fidelity/${projectId}/${tileId}_enhanced_${timestamp}.png`

  if (!env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN not configured')
  }

  const buffer = Buffer.from(enhancedImageBase64, BufferEncoding.Base64)
  const blob = await put(filename, buffer, {
    access: BlobAccess.Public,
    token: env.BLOB_READ_WRITE_TOKEN,
    contentType: ContentType.Png,
  })

  const enhancedUrl = blob.url
  logger.info('Enhanced image uploaded to Vercel Blob', { enhancedUrl })

  await metadata.set('progress', 90)
  await metadata.set('stage', TileProgressStage.PendingReview)

  const { data: tile } = await supabase
    .from('tiles')
    .select('image_filename')
    .eq('id', tileId)
    .single()

  let originalUrl = ''
  if (tile?.image_filename) {
    originalUrl = tile.image_filename.startsWith(UrlScheme.Http)
      ? tile.image_filename
      : `/projects/${projectId}/${tile.image_filename}`
  }

  await metadata.set('progress', 100)
  await metadata.set('stage', TileProgressStage.Completed)

  logger.info('Fidelity enhancement completed - pending user review', { filename })

  return {
    success: true,
    filename,
    enhancedUrl,
    enhancedBase64: enhancedImageBase64,
    originalUrl,
    pendingReview: true,
  }
}

async function enhanceFidelityWithTopaz(imageBase64: string, apiKey: string): Promise<string> {
  const fidelityMode = resolveImageFidelityMode()
  const modelType = topazEnhanceModelFromFidelityMode(fidelityMode)
  logger.info('Running Topaz fidelity enhancement', { modelType, fidelityMode })
  const result = await upscaleWithApiframe(imageBase64, apiKey, {
    modelType,
    factor: ApiframeTopazUpscaleFactor.One,
  })
  return result.imageUrl
}

async function downloadImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to download enhanced image: ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer()).toString(BufferEncoding.Base64)
}
