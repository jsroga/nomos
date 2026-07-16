import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { prepareImageUrl } from './lib/prepare-image-url'
import { runHyper3dGeneration } from './lib/run-hyper3d-generation'
import { runMeshyImageTo3d } from './lib/run-meshy-image-to-3d'
import { MeshyGenerationTopology } from './constants/meshy-generation-wire'

function resolveMeshyTopology(
  topology: 'quad' | 'triangle' | undefined,
): MeshyGenerationTopology | undefined {
  if (topology === 'quad') return MeshyGenerationTopology.Quad
  if (topology === 'triangle') return MeshyGenerationTopology.Triangle
  return undefined
}

export const generate3DModelTask = task({
  id: 'generate-3d-model',
  maxDuration: 1800, // 30 minutes
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: {
    projectId: string
    assetId: string
    imageUrl: string
    provider: 'meshy' | 'hyper3d'
    apiKey: string
    targetPolycount?: number
    topology?: 'quad' | 'triangle'
  }) => {
    const { assetId, imageUrl, provider, apiKey, targetPolycount, topology } = payload

    logger.info(`Generating 3D model for asset ${assetId} using ${provider}`)

    const finalImageUrl = await prepareImageUrl(imageUrl)
    await metadata.set('progress', 0)

    if (provider === 'meshy') {
      return runMeshyImageTo3d({
        assetId,
        finalImageUrl,
        apiKey,
        targetPolycount,
        topology: resolveMeshyTopology(topology),
      })
    }

    return runHyper3dGeneration({
      assetId,
      finalImageUrl,
      apiKey,
    })
  },
})
