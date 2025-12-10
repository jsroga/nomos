import { NextResponse } from 'next/server'

// Poll for task completion
async function pollForCompletion(
  taskId: string,
  apiKey: string,
  maxAttempts: number = 120
): Promise<any> {
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000)) // Increased poll interval to 2s

    try {
      const fetchResponse = await fetch(`https://api.cometapi.com/mj/task/${taskId}/fetch`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      const fetchData = await fetchResponse.json()

      // Log status every 10 attempts to avoid spam, or on error
      if (attempts % 5 === 0) {
        console.log(`Polling task ${taskId}: Status=${fetchData?.result?.status}, Progress=${fetchData?.result?.progress}`)
      }

      // Handle both wrapped { code: 1, result: {...} } and direct { status, ... } response formats
      const result = fetchData.result || fetchData
      const status = result.status

      if (status === 'SUCCESS') {
        console.log('Task completed successfully')
        return result
      } else if (status === 'FAILED') {
        throw new Error(result.failReason || 'Task failed')
      }
      // Still processing - continue polling
    } catch (e) {
      console.warn('Polling fetch error:', e)
    }

    attempts++
  }

  throw new Error('Task timeout - Status did not reach SUCCESS')
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { imageUrl, imageBase64, prompt, apiKey } = body

    if ((!imageUrl && !imageBase64) || !apiKey) {
      return NextResponse.json({ error: 'Missing required parameters (imageUrl/imageBase64, apiKey)' }, { status: 400 })
    }

    console.log('Starting Midjourney upscale. Has Base64:', !!imageBase64, 'Has URL:', !!imageUrl)

    // Step 1: Submit imagine task
    // If we have base64, we pass it in "base64" field.
    // If we have imageUrl, we pass it in "prompt" (standard Midjourney behavior).

    const promptText = `${imageUrl ? imageUrl + ' ' : ''}${prompt || ''} --v 6.1 --q 2 --s 250`.trim()

    // Construct payload
    const payload: any = {
      botType: 'MID_JOURNEY',
      prompt: promptText,
      accountFilter: {
        modes: ['FAST'],
      },
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

    // Step 2: Wait for imagine to complete
    console.log('Waiting for imagine task:', imagineTaskId)
    // Increase timeout to ~10 minutes (600s)
    const imagineResult = await pollForCompletion(imagineTaskId, apiKey, 600)
    console.log('Imagine completed, image URL:', imagineResult.imageUrl)

    // Step 3: Submit U1 (upscale first image) action
    // The buttons array contains actions like U1, U2, U3, U4, V1, V2, etc.
    const buttons = imagineResult.buttons || []
    const u1Button = buttons.find(
      (b: any) => b.customId?.includes('upsample::1') || b.label === 'U1'
    )

    if (!u1Button) {
      console.log(
        'Available buttons:',
        buttons.map((b: any) => b.label || b.customId)
      )
      // If no U1 button, return the imagine result (already 1024x1024)
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
      // If action fails, return the imagine result
      console.warn('Action failed, returning imagine result:', actionData.description)
      return NextResponse.json({
        url: imagineResult.imageUrl,
        taskId: imagineTaskId,
        note: 'Upscale action failed, returned variation instead',
      })
    }

    const actionTaskId = actionData.result

    // Step 4: Wait for upscale to complete
    console.log('Waiting for upscale task:', actionTaskId)
    // Increase timeout to ~10 minutes (600s)
    const upscaleResult = await pollForCompletion(actionTaskId, apiKey, 600)
    console.log('Upscale completed:', upscaleResult.imageUrl)

    return NextResponse.json({
      url: upscaleResult.imageUrl,
      taskId: actionTaskId,
      originalTaskId: imagineTaskId,
    })
  } catch (error) {
    console.error('Error upscaling with Midjourney:', error)
    return NextResponse.json(
      {
        error: 'Failed to upscale',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
