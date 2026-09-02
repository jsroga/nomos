import { logger, metadata } from '@trigger.dev/sdk'
import { JobQueue, defineOwnedTask } from '@/shared/jobs'
import { ModelProvider } from '@/shared/data/constants/protocol'
import { generate3dModelPayloadSchema } from './constants/generate-3d-model-payload'
import { prepareImageUrl } from './lib/prepare-image-url'
import { runHyper3dGeneration } from './lib/run-hyper3d-generation'
import { runMeshyImageTo3d } from './lib/run-meshy-image-to-3d'
import { MeshyGenerationMetadataKey } from './constants/meshy-generation-wire'

export const generate3DModelTask = defineOwnedTask({
  id: 'generate-3d-model',
  schema: generate3dModelPayloadSchema,
  queue: JobQueue.Meshy,
  maxDuration: 1800, // 30 minutes
  retry: {
    maxAttempts: 2,
  },
  run: async payload => {
    const { assetId, imageUrl, provider, apiKey, targetPolycount, topology } = payload

    logger.info(`Generating 3D model for asset ${assetId} using ${provider}`)

    const finalImageUrl = await prepareImageUrl(imageUrl, assetId)
    await metadata.set(MeshyGenerationMetadataKey.Progress, 0)

    if (provider === ModelProvider.Meshy) {
      return runMeshyImageTo3d({
        assetId,
        finalImageUrl,
        apiKey,
        targetPolycount,
        topology,
        onProgress: async progress => {
          await metadata.set(MeshyGenerationMetadataKey.Progress, progress)
        },
      })
    }

    return runHyper3dGeneration({
      assetId,
      finalImageUrl,
      apiKey,
    })
  },
})
