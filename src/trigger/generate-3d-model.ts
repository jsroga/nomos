import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'

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
    // Meshy-specific options
    targetPolycount?: number
    topology?: 'quad' | 'triangle'
  }) => {
    const { projectId, assetId, imageUrl, provider, apiKey, targetPolycount, topology } = payload

    logger.info(`Generating 3D model for asset ${assetId} using ${provider}`)

    // Convert local image to base64 if needed
    let finalImageUrl = imageUrl

    if (imageUrl.startsWith('/projects/')) {
      const fs = await import('fs')
      const path = await import('path')

      const filePath = path.join(process.cwd(), 'public', imageUrl)

      if (!fs.existsSync(filePath)) {
        throw new Error(`Image file not found: ${imageUrl}`)
      }

      const fileBuffer = fs.readFileSync(filePath)
      const base64 = fileBuffer.toString('base64')
      const mimeType = imageUrl.endsWith('.png') ? 'image/png' : 'image/jpeg'
      finalImageUrl = `data:${mimeType};base64,${base64}`
    }

    let modelUrl = ''

    // Initialize progress metadata
    await metadata.set('progress', 0)

    let meshyResult: any = null

    if (provider === 'meshy') {
      logger.info('Starting Meshy API call')

      // Determine if remesh is needed (only if polycount differs from default)
      const defaultPolycount = 30000
      const shouldRemesh = targetPolycount !== undefined && targetPolycount !== defaultPolycount

      // Step 1: Create task using openapi/v1 API
      const createResponse = await fetch('https://api.meshy.ai/openapi/v1/image-to-3d', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: finalImageUrl,
          ai_model: 'latest', // Meshy 6 Preview - best quality
          enable_pbr: true,
          topology: topology || 'triangle',
          target_polycount: targetPolycount || defaultPolycount,
          should_remesh: shouldRemesh,
        }),
      })

      if (!createResponse.ok) {
        const errText = await createResponse.text()
        logger.error('Meshy API error:', { status: createResponse.status, body: errText })
        let errMessage = createResponse.statusText
        try {
          const errJson = JSON.parse(errText)
          errMessage = errJson.message || errJson.error || errMessage
        } catch {}
        throw new Error(`Meshy API error: ${errMessage}`)
      }

      const { result: taskId } = await createResponse.json()
      logger.info(`Meshy task created: ${taskId}`, { topology, targetPolycount, shouldRemesh })

      // Store meshy task ID in metadata for potential direct API access
      await metadata.set('meshy_task_id', taskId)

      // Step 2: Poll for completion - 30 minute timeout with 15s intervals
      let status = 'PENDING'
      let result: any = null
      const maxAttempts = 120 // 30 minutes (120 attempts × 15 seconds)
      let attempts = 0

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 15000)) // 15 seconds

        const statusResponse = await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        })

        if (!statusResponse.ok) {
          logger.error('Status check failed:', { status: statusResponse.status })
          throw new Error('Failed to check task status')
        }

        result = await statusResponse.json()
        status = result.status
        attempts++

        const progress = result.progress || 0
        await metadata.set('progress', progress)

        logger.info(
          `Meshy status: ${status}, Progress: ${progress}% (attempt ${attempts}/${maxAttempts})`,
          { result }
        )

        // SUCCESS - RETURN IMMEDIATELY
        if (status === 'SUCCEEDED') {
          logger.info('Meshy SUCCEEDED - returning result immediately', { result })

          // Update DB (fire and forget - don't let it fail the task)
          try {
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )
            await supabase
              .from('assets')
              .update({ model_filename: result.model_urls?.glb || result.model_url })
              .eq('id', assetId)
          } catch (dbErr) {
            logger.error('DB update failed but Meshy succeeded', { dbErr })
          }

          return {
            success: true,
            modelUrl: result.model_urls?.glb || result.model_url,
            result,
          }
        }

        // FAILED - throw immediately
        if (status === 'FAILED') {
          throw new Error(
            `Meshy 3D generation failed: ${result.error || result.message || 'Unknown error'}`
          )
        }
      }

      // Timeout
      throw new Error(
        `Meshy 3D generation timed out after 30 minutes. Last status: ${status}, Progress: ${result?.progress || 0}%`
      )
    } else if (provider === 'hyper3d') {
      logger.info('Starting Hyper3D API call')

      const response = await fetch('https://api.hyper3d.ai/v1/rodin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: [
            { type: finalImageUrl.startsWith('data:') ? 'base64' : 'url', url: finalImageUrl },
          ],
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(`Hyper3D API error: ${err.message || response.statusText}`)
      }

      const { subscription_key } = await response.json()
      logger.info(`Hyper3D subscription key: ${subscription_key}`)

      // Poll for completion - increased timeout to 15 minutes
      let status = 'processing'
      let result: any = null
      const maxAttempts = 180 // 15 minutes
      let attempts = 0

      while (status === 'processing' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000))

        const statusResponse = await fetch(
          `https://api.hyper3d.ai/v1/rodin/status?subscription_key=${subscription_key}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          }
        )

        if (!statusResponse.ok) {
          throw new Error('Failed to check Hyper3D task status')
        }

        result = await statusResponse.json()
        status = result.status
        attempts++

        logger.info(`Hyper3D status: ${status} (attempt ${attempts}/${maxAttempts})`)
      }

      if (status === 'failed') {
        const errorDetails = result.error || result.message || 'Unknown error'
        throw new Error(`Hyper3D generation failed: ${errorDetails}`)
      }

      if (status !== 'completed') {
        throw new Error(`Hyper3D generation timed out after 15 minutes. Last status: ${status}`)
      }

      modelUrl = result.output?.model_url || result.model_url
    }

    // Update database (for Hyper3D path)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase
      .from('assets')
      .update({ model_filename: modelUrl })
      .eq('id', assetId)

    if (error) {
      logger.error('Failed to update asset in database', { error })
      throw error
    }

    logger.info('3D model generated successfully', { modelUrl, meshyResult })

    return {
      success: true,
      modelUrl,
      result: meshyResult, // Full Meshy response with model_urls, texture_urls, thumbnail_url
    }
  },
})
