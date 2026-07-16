import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { supabaseAdmin } from '@/shared/auth/supabase-admin'
import { recordFromJson } from '@/shared/data/json-guards'
import {
  MeshyTaskStatusValue,
  parseMeshyTaskResult,
  type MeshyTaskResult,
} from './constants/meshy-task-types'

export const remesh3DModelTask = task({
  id: 'remesh-3d-model',
  maxDuration: 1800, // 30 minutes
  retry: {
    maxAttempts: 1, // Don't retry - costs money
  },
  run: async (payload: {
    assetId: string
    meshyTaskId: string // From original generation
    apiKey: string
    topology: 'quad' | 'triangle'
    targetPolycount: number
    resizeHeight?: number
  }) => {
    const { assetId, meshyTaskId, apiKey, topology, targetPolycount, resizeHeight } = payload

    logger.info(`Remeshing 3D model for asset ${assetId}, original task: ${meshyTaskId}`)

    await metadata.set('progress', 0)
    await metadata.set('meshy_task_id', meshyTaskId)

    const remeshBody: Record<string, unknown> = {
      input_task_id: meshyTaskId,
      target_formats: ['glb', 'fbx', 'obj', 'usdz'],
      topology: topology,
      target_polycount: targetPolycount,
      origin_at: 'bottom',
    }

    if (resizeHeight && resizeHeight > 0) {
      remeshBody.resize_height = resizeHeight
    }

    logger.info('Creating remesh task', { remeshBody })

    const createResponse = await fetch('https://api.meshy.ai/openapi/v1/remesh', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(remeshBody),
    })

    if (!createResponse.ok) {
      const errText = await createResponse.text()
      logger.error('Remesh API error:', { status: createResponse.status, body: errText })
      let errMessage = createResponse.statusText
      try {
        const errJson = recordFromJson(JSON.parse(errText))
        errMessage =
          (typeof errJson.message === 'string' ? errJson.message : undefined) ??
          (typeof errJson.error === 'string' ? errJson.error : undefined) ??
          errMessage
      } catch {
        // Ignore JSON parse errors, use status text
      }
      throw new Error(`Meshy Remesh API error: ${errMessage}`)
    }

    const createJson = recordFromJson(await createResponse.json())
    const remeshTaskId = createJson.result
    if (typeof remeshTaskId !== 'string') {
      throw new Error('Meshy remesh API did not return a task id')
    }

    logger.info(`Meshy remesh task created: ${remeshTaskId}`)
    await metadata.set('remesh_task_id', remeshTaskId)

    let status: string = MeshyTaskStatusValue.Pending
    let result: MeshyTaskResult | null = null
    const maxAttempts = 120
    let attempts = 0

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 15000))

      const statusResponse = await fetch(`https://api.meshy.ai/openapi/v1/remesh/${remeshTaskId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!statusResponse.ok) {
        logger.error('Remesh status check failed:', { status: statusResponse.status })
        throw new Error('Failed to check remesh task status')
      }

      result = parseMeshyTaskResult(await statusResponse.json())
      status = result.status
      attempts++

      const progress = result.progress ?? 0
      await metadata.set('progress', progress)

      logger.info(
        `Meshy remesh status: ${status}, Progress: ${progress}% (attempt ${attempts}/${maxAttempts})`,
        { result }
      )

      if (status === MeshyTaskStatusValue.Succeeded) {
        logger.info('Meshy remesh SUCCEEDED - returning result immediately', { result })

        const remeshedModelUrl = result.model_urls?.glb

        try {
          const { data: asset } = await supabaseAdmin
            .from('assets')
            .select('metadata')
            .eq('id', assetId)
            .single()

          const currentMetadata = recordFromJson(asset?.metadata)

          await supabaseAdmin
            .from('assets')
            .update({
              metadata: {
                ...currentMetadata,
                remesh_status: 'completed',
                remesh_meshy_task_id: remeshTaskId,
                remesh_result: result,
              },
            })
            .eq('id', assetId)
        } catch (dbErr) {
          logger.error('DB update failed but Meshy remesh succeeded', { dbErr })
        }

        return {
          success: true,
          modelUrl: remeshedModelUrl,
          result,
        }
      }

      if (status === MeshyTaskStatusValue.Failed) {
        throw new Error(`Meshy remesh failed: ${result.task_error?.message ?? 'Unknown error'}`)
      }
    }

    throw new Error(
      `Meshy remesh timed out after 30 minutes. Last status: ${status}, Progress: ${result?.progress ?? 0}%`
    )
  },
})
