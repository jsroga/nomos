/**
 * generate-tile run body, extracted so checkpoint tests can inject deps.
 */

import { logger, metadata } from '@trigger.dev/sdk'
import { aiProviderConfigFromRecord } from '@/shared/ai/ai-provider-config'
import { packedCropFromContext } from './constants/generate-tile'
import type { GenerateTilePayload } from './constants/generate-tile'
import { PackedCropError } from './constants/generate-tile-output'
import {
  assembleServerContextImage,
  createSupabaseServiceClient,
  extractContextImageBase64,
  resolveOriginalTileUrl,
  uploadTileToBlob,
} from './constants/generate-tile-persist'
import { generateTileImage } from './constants/generate-tile-providers'
import {
  GenerateTileProgress,
  GenerateTileStage,
  advanceGenerateTileProgress,
} from './constants/generate-tile-progress'
import {
  downloadTileScratchBase64,
  readTileScratchUrl,
  uploadTileScratch,
  writeTileScratchUrl,
} from './constants/generate-tile-scratch'

enum GenerateTileCoordKey {
  TileX = 'tile_x',
  TileY = 'tile_y',
}

export interface GenerateTileRunDeps {
  generateTileImage: typeof generateTileImage
  uploadScratch: typeof uploadTileScratch
  readScratchUrl: typeof readTileScratchUrl
  writeScratchUrl: typeof writeTileScratchUrl
  downloadScratch: typeof downloadTileScratchBase64
  uploadFinal: typeof uploadTileToBlob
}

export const defaultGenerateTileRunDeps: GenerateTileRunDeps = {
  generateTileImage,
  uploadScratch: uploadTileScratch,
  readScratchUrl: readTileScratchUrl,
  writeScratchUrl: writeTileScratchUrl,
  downloadScratch: downloadTileScratchBase64,
  uploadFinal: uploadTileToBlob,
}

export async function runGenerateTile(
  payload: GenerateTilePayload,
  deps: GenerateTileRunDeps = defaultGenerateTileRunDeps,
): Promise<{
  success: true
  filename: string
  newUrl: string
  originalUrl: string | undefined
  isFirstTile: boolean
  pendingReview: true
}> {
  const {
    projectId,
    x,
    y,
    prompt,
    aiProvider,
    aiConfig,
    isFirstTile = true,
    styleReferenceUrls,
    styleContext,
    masterPrompt,
    modePromptFragment,
    modeNegatives,
    styleAnchorUrl,
    neighbors,
    neighborImageUrls,
  } = payload

  let contextImageBase64 = extractContextImageBase64(payload)
  let packedCrop = payload.packedCrop ?? packedCropFromContext(payload.contextPayload)

  logger.info(`Generating tile at ${x},${y} for project ${projectId}`, {
    isFirstTile,
    hasContext: !!contextImageBase64,
    hasNeighbors: !!neighbors,
    hasStyleRefs: !!styleReferenceUrls?.length,
    hasPackedCrop: !!packedCrop,
  })

  await advanceGenerateTileProgress(GenerateTileProgress.Init, GenerateTileStage.Initializing)
  await metadata.set(GenerateTileCoordKey.TileX, x)
  await metadata.set(GenerateTileCoordKey.TileY, y)

  if (!isFirstTile && !contextImageBase64 && neighbors) {
    await advanceGenerateTileProgress(
      GenerateTileProgress.Init,
      GenerateTileStage.AssemblingContext,
    )
    const assembled = await assembleServerContextImage(x, y, neighbors)
    contextImageBase64 = assembled.imageBase64
    packedCrop = assembled.packedCrop
  }

  if (!isFirstTile && !packedCrop) {
    throw new Error(PackedCropError.MissingPackedCrop)
  }

  await advanceGenerateTileProgress(
    GenerateTileProgress.Generating,
    GenerateTileStage.GeneratingImage,
  )

  const existingScratch = deps.readScratchUrl()
  let generatedImageBase64: string
  if (existingScratch) {
    generatedImageBase64 = await deps.downloadScratch(existingScratch)
  } else {
    const providerConfig = aiProviderConfigFromRecord(aiConfig)
    generatedImageBase64 = await deps.generateTileImage(
      aiProvider,
      prompt,
      providerConfig,
      isFirstTile,
      styleReferenceUrls,
      contextImageBase64,
      styleContext,
      masterPrompt,
      modePromptFragment,
      modeNegatives,
      styleAnchorUrl,
      neighborImageUrls,
      packedCrop,
    )
    const scratchUrl = await deps.uploadScratch(projectId, x, y, generatedImageBase64)
    await deps.writeScratchUrl(scratchUrl)
  }

  await advanceGenerateTileProgress(GenerateTileProgress.Uploading, GenerateTileStage.Uploading)

  const { filename, newUrl } = await deps.uploadFinal(projectId, x, y, generatedImageBase64)

  const supabase = createSupabaseServiceClient()

  await advanceGenerateTileProgress(
    GenerateTileProgress.CheckingOriginal,
    GenerateTileStage.CheckingOriginal,
  )

  const originalUrl = await resolveOriginalTileUrl(supabase, projectId, x, y)

  await advanceGenerateTileProgress(GenerateTileProgress.Completed, GenerateTileStage.Completed)
  logger.info('Tile generated - pending user review', { filename, hasOriginal: !!originalUrl })

  return {
    success: true,
    filename,
    newUrl,
    originalUrl,
    isFirstTile: !originalUrl,
    pendingReview: true,
  }
}
