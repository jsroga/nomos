import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { aiProviderConfigFromRecord } from '@/shared/ai/ai-provider-config'
import type { GenerateTilePayload } from './constants/generate-tile'
import { packedCropFromContext } from './constants/generate-tile'
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
  runWithTileProgress,
} from './constants/generate-tile-progress'

enum GenerateTileCoordKey {
  TileX = 'tile_x',
  TileY = 'tile_y',
}

export const generateTileTask = task({
  id: 'generate-tile',
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: GenerateTilePayload) =>
    runWithTileProgress(async () => {
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

    const providerConfig = aiProviderConfigFromRecord(aiConfig)
    const generatedImageBase64 = await generateTileImage(
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

    await advanceGenerateTileProgress(GenerateTileProgress.Uploading, GenerateTileStage.Uploading)

    const { filename, newUrl } = await uploadTileToBlob(projectId, x, y, generatedImageBase64)

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
  }),
})
