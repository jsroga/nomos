import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

/**
 * @openapi
 * /api/generate-3d:
 *   post:
 *     summary: Generate 3D model from image
 *     description: Converts a 2D image to a 3D model using Meshy or Hyper3D API
 *     tags:
 *       - 3D Assets
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetId
 *               - imageUrl
 *               - provider
 *               - apiKey
 *             properties:
 *               assetId:
 *                 type: string
 *                 description: Unique identifier for the asset
 *               imageUrl:
 *                 type: string
 *                 description: URL or local path to the source image
 *               provider:
 *                 type: string
 *                 enum: [meshy, hyper3d]
 *                 description: 3D generation provider to use
 *               apiKey:
 *                 type: string
 *                 description: API key for the selected provider
 *     responses:
 *       200:
 *         description: Successfully generated 3D model
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 modelUrl:
 *                   type: string
 *                   description: URL to the generated GLB model
 *       400:
 *         description: Missing required fields or unknown provider
 *       404:
 *         description: Image file not found
 *       500:
 *         description: Generation failed
 */

export async function POST(request: Request) {
  try {
    const { assetId, imageUrl, provider, apiKey } = await request.json()

    if (!assetId || !imageUrl || !provider || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Convert relative URL to base64 data URI if it's a local file
    let finalImageUrl = imageUrl

    if (imageUrl.startsWith('/projects/')) {
      // Read local file and convert to base64 data URI
      const filePath = path.join(process.cwd(), 'public', imageUrl)

      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: `Image file not found: ${imageUrl}` }, { status: 404 })
      }

      const fileBuffer = fs.readFileSync(filePath)
      const base64 = fileBuffer.toString('base64')
      const mimeType = imageUrl.endsWith('.png') ? 'image/png' : 'image/jpeg'
      finalImageUrl = `data:${mimeType};base64,${base64}`
    }

    let modelUrl = ''

    if (provider === 'meshy') {
      // Meshy API - Image to 3D
      // Step 1: Create task
      const createResponse = await fetch('https://api.meshy.ai/v1/image-to-3d', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: finalImageUrl,
          enable_pbr: true,
        }),
      })

      if (!createResponse.ok) {
        const err = await createResponse.json()
        throw new Error(`Meshy API error: ${err.message || createResponse.statusText}`)
      }

      const { result: taskId } = await createResponse.json()

      // Step 2: Poll for completion
      let status = 'PENDING'
      let result: any = null
      const maxAttempts = 60 // 5 minutes max
      let attempts = 0

      while (status !== 'SUCCEEDED' && status !== 'FAILED' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds

        const statusResponse = await fetch(`https://api.meshy.ai/v1/image-to-3d/${taskId}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        })

        if (!statusResponse.ok) {
          throw new Error('Failed to check task status')
        }

        result = await statusResponse.json()
        status = result.status
        attempts++
      }

      if (status === 'FAILED') {
        throw new Error('Meshy 3D generation failed')
      }

      if (status !== 'SUCCEEDED') {
        throw new Error('Meshy 3D generation timed out')
      }

      modelUrl = result.model_urls?.glb || result.model_url
    } else if (provider === 'hyper3d') {
      // Hyper3D API
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

      // Poll for completion
      let status = 'processing'
      let result: any = null
      const maxAttempts = 60
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
      }

      if (status === 'failed') {
        throw new Error('Hyper3D generation failed')
      }

      if (status !== 'completed') {
        throw new Error('Hyper3D generation timed out')
      }

      modelUrl = result.output?.model_url || result.model_url
    } else {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
    }

    return NextResponse.json({ success: true, modelUrl })
  } catch (error: any) {
    console.error('3D generation error:', error)
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 })
  }
}
