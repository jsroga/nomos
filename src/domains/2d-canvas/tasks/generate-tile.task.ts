import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { aiProviderConfigFromRecord } from '@/shared/ai/ai-provider-config'
import type { GenerateTilePayload } from './constants/generate-tile'
import {
  assembleServerContextImage,
  createSupabaseServiceClient,
  extractContextImageBase64,
  resolveOriginalTileUrl,
  uploadTileToBlob,
} from './constants/generate-tile-persist'
import { generateTileImage } from './constants/generate-tile-providers'

export const generateTileTask = task({
  id: 'generate-tile',
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: GenerateTilePayload) => {
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
      neighbors,
    } = payload

    let contextImageBase64 = extractContextImageBase64(payload)

    logger.info(`Generating tile at ${x},${y} for project ${projectId}`, {
      isFirstTile,
      hasContext: !!contextImageBase64,
      hasNeighbors: !!neighbors,
      hasStyleRefs: !!styleReferenceUrls?.length,
    })

    await metadata.set('progress', 0)
    await metadata.set('stage', 'initializing')
    await metadata.set('tile_x', x)
    await metadata.set('tile_y', y)

    if (!isFirstTile && !contextImageBase64 && neighbors) {
      await metadata.set('stage', 'assembling_context')
      contextImageBase64 = await assembleServerContextImage(x, y, neighbors)
    }

    await metadata.set('stage', 'generating_image')
    await metadata.set('progress', 30)

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
    )

    await metadata.set('progress', 70)
    await metadata.set('stage', 'uploading')
    await metadata.set('progress', 80)

    const { filename, newUrl } = await uploadTileToBlob(projectId, x, y, generatedImageBase64)

    const supabase = createSupabaseServiceClient()

    await metadata.set('stage', 'checking_original')
    await metadata.set('progress', 95)

    const originalUrl = await resolveOriginalTileUrl(supabase, projectId, x, y)

    await metadata.set('progress', 100)
    await metadata.set('stage', 'completed')
    logger.info('Tile generated - pending user review', { filename, hasOriginal: !!originalUrl })

    return {
      success: true,
      filename,
      newUrl,
      originalUrl,
      isFirstTile: !originalUrl,
      pendingReview: true,
    }
  },
})
