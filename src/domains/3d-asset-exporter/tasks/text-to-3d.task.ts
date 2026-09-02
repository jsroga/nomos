import { logger, metadata } from '@trigger.dev/sdk'
import { JobQueue, defineOwnedTask } from '@/shared/jobs'
import { MeshyArtStyle, MeshyTopology } from '@/shared/data/constants/protocol'
import { textTo3dPayloadSchema } from './constants/meshy-payloads'
import { supabaseAdmin } from '@/shared/auth/supabase-admin'
import { storageService } from '@/shared/data/storage/storage-service'
import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import { v4 as uuidv4 } from 'uuid'
import {
  MeshyTaskStatusValue,
  parseMeshyTask,
  type MeshyTask,
} from './constants/meshy-task-types'

const MESHY_BASE_URL = 'https://api.meshy.ai/openapi/v2/text-to-3d'

const TEXT_TO_3D_DEFAULT_POLYCOUNT = 30000

export const textTo3DTask = defineOwnedTask({
  id: 'text-to-3d',
  schema: textTo3dPayloadSchema,
  queue: JobQueue.Meshy,
  maxDuration: 3600, // 1 hour - Text-to-3D can take a while (preview + refine)
  retry: {
    maxAttempts: 2,
  },
  run: async payload => {
    const {
      projectId,
      prompt,
      seed,
      apiKey,
      artStyle = MeshyArtStyle.Realistic,
      enablePbr = true,
      targetPolycount = TEXT_TO_3D_DEFAULT_POLYCOUNT,
      topology = MeshyTopology.Triangle,
    } = payload

    logger.info('Starting Text-to-3D generation', { prompt, seed, artStyle })

    await metadata.set('stage', 'preview')
    await metadata.set('progress', 0)

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
        seed,
        ai_model: 'latest', // Meshy 6 Preview - best quality
        topology,
        target_polycount: targetPolycount,
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
        enable_pbr: enablePbr,
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
    const filename = `text-to-3d_${uuidv4()}.glb`
    const savedUrl = await storageService.uploadPublicFile(
      `assets/${projectId}/${filename}`,
      Buffer.from(glbBuffer),
      'model/gltf-binary'
    )

    if (!savedUrl) {
      throw new Error('Failed to upload model to storage')
    }

    logger.info('Model saved to storage', { url: savedUrl })

    // ============================================
    // STAGE 4: Create asset record in database
    // ============================================
    await metadata.set('stage', 'creating_asset')

    const supabase = supabaseAdmin

    const assetId = uuidv4()
    const { error: insertError } = await supabase.from('assets').insert({
      id: assetId,
      project_id: projectId,
      image_filename: refineResult.thumbnailUrl || '', // Meshy provides a thumbnail
      model_filename: savedUrl,
      metadata: {
        prompt,
        seed,
        artStyle,
        meshyPreviewTaskId: previewTaskId,
        meshyRefineTaskId: refineTaskId,
        generatedAt: new Date().toISOString(),
      },
    })

    if (insertError) {
      logger.error('Failed to create asset record', { error: insertError })
      // Don't throw - the model is saved, we can still return success
    } else {
      logger.info('Asset record created', { assetId })
    }

    await metadata.set('progress', 100)
    await metadata.set('stage', 'completed')

    return {
      success: true,
      assetId,
      modelUrl: savedUrl,
      thumbnailUrl: refineResult.thumbnailUrl,
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
    const progress = result.progress ?? 0

    // Update metadata with progress
    if (stage === 'preview') {
      await metadata.set('progress', Math.round(progress * 0.4)) // 0-40%
    } else {
      await metadata.set('progress', 40 + Math.round(progress * 0.4)) // 40-80%
    }

    logger.info(`${stage} task progress: ${progress}%`, { status: result.status })

    if (result.status === MeshyTaskStatusValue.Succeeded) {
      return result
    }

    if (result.status === MeshyTaskStatusValue.Failed) {
      const errorMsg = result.taskError?.message ?? 'Unknown error'
      throw new Error(`Meshy ${stage} task failed: ${errorMsg}`)
    }

    attempts++
  }

  throw new Error(`Meshy ${stage} task timed out after 30 minutes`)
}
