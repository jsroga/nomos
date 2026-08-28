import { logger, metadata } from '@trigger.dev/sdk'
import { JobQueue, defineOwnedTask } from '@/shared/jobs'
import { MeshyArtStyle } from '@/shared/data/constants/protocol'
import { surfaceMaterialPayloadSchema } from './constants/meshy-payloads'
import { storageService } from '@/shared/data/storage/storage-service'
import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import { v4 as uuidv4 } from 'uuid'
import {
  parseMeshyTask,
  type MeshyTask,
} from './constants/meshy-task-types'

const MESHY_BASE_URL = 'https://api.meshy.ai/openapi/v2/text-to-3d'

export const surfaceMaterialTask = defineOwnedTask({
  id: 'surface-material',
  schema: surfaceMaterialPayloadSchema,
  queue: JobQueue.Meshy,
  maxDuration: 3600, // 1 hour - Text-to-3D can take a while (preview + refine)
  retry: {
    maxAttempts: 2,
  },
  run: async payload => {
    const {
      projectId,
      surfaceId,
      prompt,
      apiKey,
      artStyle = MeshyArtStyle.Realistic,
      surfaceBounds,
    } = payload

    logger.info('Starting surface material generation', { surfaceId, prompt, artStyle })

    await metadata.set('stage', 'preview')
    await metadata.set('progress', 0)
    await metadata.set('surfaceId', surfaceId)

    // ============================================
    // STAGE 1: Create Preview Task (mesh generation)
    // ============================================
    const previewResponse = await fetch(MESHY_BASE_URL, {
      method: HttpMethod.Post,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': ContentType.Json,
      },
      body: JSON.stringify({
        mode: 'preview',
        prompt,
        art_style: artStyle,
        ai_model: 'latest', // Meshy 6 Preview - best quality
        topology: 'triangle',
        target_polycount: 30000,
        should_remesh: true,
      }),
    })

    if (!previewResponse.ok) {
      const errText = await previewResponse.text()
      logger.error('Meshy preview task creation failed', {
        status: previewResponse.status,
        body: errText,
      })
      let errMessage = previewResponse.statusText
      try {
        const errJson = JSON.parse(errText)
        errMessage = errJson.message || errJson.error || errMessage
      } catch {
        // Ignore JSON parse errors, use status text
      }
      throw new Error(`Meshy preview API error: ${errMessage}`)
    }

    const { result: previewTaskId } = await previewResponse.json()
    logger.info('Preview task created', { taskId: previewTaskId })
    await metadata.set('preview_task_id', previewTaskId)

    // Poll preview task until complete
    const previewResult = await pollMeshyTask(previewTaskId, apiKey, 'preview')
    logger.info('Preview task completed', { status: previewResult.status })
    await metadata.set('progress', 40)

    // ============================================
    // STAGE 2: Create Refine Task (texturing)
    // ============================================
    await metadata.set('stage', 'refine')

    const refineResponse = await fetch(MESHY_BASE_URL, {
      method: HttpMethod.Post,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': ContentType.Json,
      },
      body: JSON.stringify({
        mode: 'refine',
        preview_task_id: previewTaskId,
        enable_pbr: true,
        ai_model: 'latest',
      }),
    })

    if (!refineResponse.ok) {
      const errText = await refineResponse.text()
      logger.error('Meshy refine task creation failed', {
        status: refineResponse.status,
        body: errText,
      })
      let errMessage = refineResponse.statusText
      try {
        const errJson = JSON.parse(errText)
        errMessage = errJson.message || errJson.error || errMessage
      } catch {
        // Ignore JSON parse errors, use status text
      }
      throw new Error(`Meshy refine API error: ${errMessage}`)
    }

    const { result: refineTaskId } = await refineResponse.json()
    logger.info('Refine task created', { taskId: refineTaskId })
    await metadata.set('refine_task_id', refineTaskId)

    // Poll refine task until complete
    const refineResult = await pollMeshyTask(refineTaskId, apiKey, 'refine')
    logger.info('Refine task completed', { status: refineResult.status })
    await metadata.set('progress', 80)

    // ============================================
    // STAGE 3: Save result to storage
    // ============================================
    await metadata.set('stage', 'saving')

    const modelUrl = refineResult.modelUrls?.glb
    if (!modelUrl) {
      throw new Error('No GLB model URL in Meshy response')
    }

    // Download the GLB from Meshy
    const glbResponse = await fetch(modelUrl)
    if (!glbResponse.ok) {
      throw new Error('Failed to download GLB from Meshy')
    }
    const glbBuffer = await glbResponse.arrayBuffer()

    // Upload to our storage (Vercel Blob)
    const filename = `surface-material_${surfaceId}_${uuidv4()}.glb`
    const savedUrl = await storageService.uploadPublicFile(
      `assets/${projectId}/${filename}`,
      Buffer.from(glbBuffer),
      'model/gltf-binary'
    )

    if (!savedUrl) {
      throw new Error('Failed to upload model to storage')
    }

    logger.info('Model saved to storage', { url: savedUrl })

    await metadata.set('progress', 100)
    await metadata.set('stage', 'completed')

    return {
      success: true,
      surfaceId,
      modelUrl: savedUrl,
      thumbnailUrl: refineResult.thumbnailUrl,
      surfaceBounds,
      meshyResult: {
        previewTaskId,
        refineTaskId,
        textureUrls: refineResult.textureUrls,
      },
    }
  },
})

/**
 * Poll a Meshy task until it completes or fails
 */
async function pollMeshyTask(
  taskId: string,
  apiKey: string,
  stage: 'preview' | 'refine'
): Promise<MeshyTask> {
  const maxAttempts = 180 // 30 minutes (10s interval)
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000)) // 10 seconds

    const response = await fetch(`${MESHY_BASE_URL}/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      logger.warn(`Failed to check ${stage} task status`, { status: response.status })
      attempts++
      continue
    }

    const result = parseMeshyTask(await response.json())
    const progress = result.progress || 0

    // Update metadata with progress
    if (stage === 'preview') {
      await metadata.set('progress', Math.round(progress * 0.4)) // 0-40%
    } else {
      await metadata.set('progress', 40 + Math.round(progress * 0.4)) // 40-80%
    }

    logger.info(`${stage} task progress: ${progress}%`, { status: result.status })

    if (result.status === 'SUCCEEDED') {
      return result
    }

    if (result.status === 'FAILED') {
      const errorMsg = result.taskError?.message || 'Unknown error'
      throw new Error(`Meshy ${stage} task failed: ${errorMsg}`)
    }

    attempts++
  }

  throw new Error(`Meshy ${stage} task timed out after 30 minutes`)
}
