import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'

// Poll for task completion
async function pollForCompletion(
  taskId: string,
  apiKey: string,
  maxAttempts: number = 120
): Promise<any> {
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000))

    try {
      const fetchResponse = await fetch(`https://api.cometapi.com/mj/task/${taskId}/fetch`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      const fetchData = await fetchResponse.json()

      if (attempts % 5 === 0) {
        console.log(
          `Polling task ${taskId}: Status=${fetchData?.result?.status}, Progress=${fetchData?.result?.progress}`
        )
      }

      const result = fetchData.result || fetchData
      const status = result.status

      if (status === 'SUCCESS') {
        console.log('Task completed successfully')
        return result
      } else if (status === 'FAILED') {
        throw new Error(result.failReason || 'Task failed')
      }
    } catch (e) {
      console.warn('Polling fetch error:', e)
    }

    attempts++
  }

  throw new Error('Task timeout - Status did not reach SUCCESS')
}

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
    const body = await request.json()
    const { imageUrl, imageBase64, prompt, apiKey, styleReferenceUrls } = body

    if ((!imageUrl && !imageBase64) || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required parameters (imageUrl/imageBase64, apiKey)' },
        { status: 400 }
      )
    }

    console.log('Starting Midjourney upscale. Has Base64:', !!imageBase64, 'Has URL:', !!imageUrl)

    const srefParam =
      Array.isArray(styleReferenceUrls) && styleReferenceUrls.length > 0
        ? ` --sref ${styleReferenceUrls.join(' ')}`
        : ''

    const promptText =
      `${imageUrl ? imageUrl + ' ' : ''}${prompt || ''} --v 6.1 --q 2 --s 250${srefParam}`.trim()

    const payload: any = {
      botType: 'MID_JOURNEY',
      prompt: promptText,
      accountFilter: { modes: ['FAST'] },
    }

    if (imageBase64) {
      payload.base64 = imageBase64
    }

    const imagineResponse = await fetch('https://api.cometapi.com/mj/submit/imagine', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const imagineData = await imagineResponse.json()
    console.log('Imagine response:', imagineData)

    if (imagineData.code !== 1) {
      throw new Error(imagineData.description || 'Failed to submit imagine task')
    }

    const imagineTaskId = imagineData.result

    console.log('Waiting for imagine task:', imagineTaskId)
    const imagineResult = await pollForCompletion(imagineTaskId, apiKey, 600)
    console.log('Imagine completed, image URL:', imagineResult.imageUrl)

    const buttons = imagineResult.buttons || []
    const u1Button = buttons.find(
      (b: any) => b.customId?.includes('upsample::1') || b.label === 'U1'
    )

    if (!u1Button) {
      console.log(
        'Available buttons:',
        buttons.map((b: any) => b.label || b.customId)
      )
      console.log('No U1 button found, returning imagine result')
      return NextResponse.json({
        url: imagineResult.imageUrl,
        taskId: imagineTaskId,
        note: 'Returned variation grid (no upscale button available)',
      })
    }

    console.log('Submitting U1 upscale action')
    const actionResponse = await fetch('https://api.cometapi.com/mj/submit/action', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customId: u1Button.customId,
        taskId: imagineTaskId,
      }),
    })

    const actionData = await actionResponse.json()
    console.log('Action response:', actionData)

    if (actionData.code !== 1) {
      console.warn('Action failed, returning imagine result:', actionData.description)
      return NextResponse.json({
        url: imagineResult.imageUrl,
        taskId: imagineTaskId,
        note: 'Upscale action failed, returned variation instead',
      })
    }

    const actionTaskId = actionData.result

    console.log('Waiting for upscale task:', actionTaskId)
    const upscaleResult = await pollForCompletion(actionTaskId, apiKey, 600)
    console.log('Upscale completed:', upscaleResult.imageUrl)

    return NextResponse.json({
      url: upscaleResult.imageUrl,
      taskId: actionTaskId,
      originalTaskId: imagineTaskId,
    })
  }),
  { maxRequests: 3, windowMs: 60000 }
)
