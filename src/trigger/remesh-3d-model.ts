import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'

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
    // User settings
    topology: 'quad' | 'triangle'
    targetPolycount: number
    resizeHeight?: number
  }) => {
    const { assetId, meshyTaskId, apiKey, topology, targetPolycount, resizeHeight } = payload

    logger.info(`Remeshing 3D model for asset ${assetId}, original task: ${meshyTaskId}`)

    // Initialize progress metadata
    await metadata.set('progress', 0)
    await metadata.set('meshy_task_id', meshyTaskId)

    // Step 1: Create remesh task
    // POST https://api.meshy.ai/openapi/v1/remesh
    const remeshBody: Record<string, any> = {
      input_task_id: meshyTaskId,
      target_formats: ['glb', 'fbx', 'obj', 'usdz'],
      topology: topology,
      target_polycount: targetPolycount,
      origin_at: 'bottom',
    }

    // Only include resize_height if provided
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
        const errJson = JSON.parse(errText)
        errMessage = errJson.message || errJson.error || errMessage
      } catch {
        // Ignore JSON parse errors, use status text
      }
      throw new Error(`Meshy Remesh API error: ${errMessage}`)
    }

    const { result: remeshTaskId } = await createResponse.json()
    logger.info(`Meshy remesh task created: ${remeshTaskId}`)

    // Store remesh task ID in metadata
    await metadata.set('remesh_task_id', remeshTaskId)

    // Step 2: Poll for completion - 30 minute timeout with 15s intervals
    let status = 'PENDING'
    let result: any = null
    const maxAttempts = 120 // 30 minutes (120 attempts × 15 seconds)
    let attempts = 0

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 15000)) // 15 seconds

      // GET https://api.meshy.ai/openapi/v1/remesh/{id}
      const statusResponse = await fetch(`https://api.meshy.ai/openapi/v1/remesh/${remeshTaskId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!statusResponse.ok) {
        logger.error('Remesh status check failed:', { status: statusResponse.status })
        throw new Error('Failed to check remesh task status')
      }

      result = await statusResponse.json()
      status = result.status
      attempts++

      const progress = result.progress || 0
      await metadata.set('progress', progress)

      logger.info(
        `Meshy remesh status: ${status}, Progress: ${progress}% (attempt ${attempts}/${maxAttempts})`,
        { result }
      )

      // SUCCESS - RETURN IMMEDIATELY
      if (status === 'SUCCEEDED') {
        logger.info('Meshy remesh SUCCEEDED - returning result immediately', { result })

        const remeshedModelUrl = result.model_urls?.glb

        // Update DB with remeshed model
        try {
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          )

          // Get current metadata
          const { data: asset } = await supabase
            .from('assets')
            .select('metadata')
            .eq('id', assetId)
            .single()

          const currentMetadata = (asset?.metadata as any) || {}

          // Update with remesh result
          await supabase
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

      // FAILED - throw immediately
      if (status === 'FAILED') {
        throw new Error(`Meshy remesh failed: ${result.task_error?.message || 'Unknown error'}`)
      }
    }

    // Timeout
    throw new Error(
      `Meshy remesh timed out after 30 minutes. Last status: ${status}, Progress: ${result?.progress || 0}%`
    )
  },
})
