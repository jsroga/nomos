import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  ContentType,
  HttpMethod,
  MidjourneyAccountMode,
  MidjourneyBotType,
  MidjourneyButtonLabel,
  MidjourneyTaskStatus,
  MidjourneyUpsampleId,
} from '@/shared/data/constants/protocol'

async function pollForCompletion(
  taskId: string,
  apiKey: string,
  maxAttempts: number = 120
): Promise<Record<string, unknown>> {
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000))

    try {
      const fetchResponse = await fetch(`https://api.cometapi.com/mj/task/${taskId}/fetch`, {
        method: HttpMethod.Get,
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

      if (status === MidjourneyTaskStatus.Success) {
        console.log(API_LOG_PREFIX.MJ_TASK_COMPLETED)
        return result
      } else if (status === MidjourneyTaskStatus.Failed) {
        const failReason = typeof result.failReason === 'string' ? result.failReason : API_ERROR.MJ_TASK_FAILED
        throw new Error(failReason)
      }
    } catch (e) {
      console.warn(API_LOG_PREFIX.MJ_POLL_ERROR, e)
    }

    attempts++
  }

  throw new Error(API_ERROR.MJ_TASK_TIMEOUT)
}

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, {}: AuthenticatedRequest) => {
    const body = await request.json()
    const { imageUrl, imageBase64, prompt, apiKey, styleReferenceUrls } = body

    if ((!imageUrl && !imageBase64) || !apiKey) {
      return NextResponse.json({ error: API_ERROR.MISSING_UPSCALE_PARAMS }, { status: 400 })
    }

    console.log(API_LOG_PREFIX.MJ_STARTING_UPSCALE, !!imageBase64, API_LOG_PREFIX.MJ_HAS_URL, !!imageUrl)

    const srefParam =
      Array.isArray(styleReferenceUrls) && styleReferenceUrls.length > 0
        ? ` --sref ${styleReferenceUrls.join(' ')}`
        : ''

    const promptText =
      `${imageUrl ? imageUrl + ' ' : ''}${prompt || ''} --v 6.1 --q 2 --s 250${srefParam}`.trim()

    const payload: Record<string, unknown> = {
      botType: MidjourneyBotType.MidJourney,
      prompt: promptText,
      accountFilter: { modes: [MidjourneyAccountMode.Fast] },
    }

    if (imageBase64) {
      payload.base64 = imageBase64
    }

    const imagineResponse = await fetch('https://api.cometapi.com/mj/submit/imagine', {
      method: HttpMethod.Post,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': ContentType.Json,
      },
      body: JSON.stringify(payload),
    })

    const imagineData = await imagineResponse.json()
    console.log(API_LOG_PREFIX.MJ_IMAGINE_RESPONSE, imagineData)

    if (imagineData.code !== 1) {
      throw new Error(imagineData.description || API_ERROR.MJ_FAILED_SUBMIT)
    }

    const imagineTaskId = imagineData.result

    console.log(API_LOG_PREFIX.MJ_WAITING_IMAGINE, imagineTaskId)
    const imagineResult = await pollForCompletion(imagineTaskId, apiKey, 600)
    console.log(API_LOG_PREFIX.MJ_IMAGINE_COMPLETED, imagineResult.imageUrl)

    const buttons = Array.isArray(imagineResult.buttons) ? imagineResult.buttons : []
    const u1Button = buttons.find((button: Record<string, unknown>) => {
      const customId = typeof button.customId === 'string' ? button.customId : ''
      const label = typeof button.label === 'string' ? button.label : ''
      return customId.includes(MidjourneyUpsampleId.Upsample1) || label === MidjourneyButtonLabel.U1
    })

    if (!u1Button) {
      console.log(
        API_LOG_PREFIX.MJ_AVAILABLE_BUTTONS,
        buttons.map((button: Record<string, unknown>) => button.label || button.customId)
      )
      console.log(API_LOG_PREFIX.MJ_NO_U1)
      return NextResponse.json({
        url: imagineResult.imageUrl,
        taskId: imagineTaskId,
        note: API_ERROR.MJ_UPSCALE_VARIATION_NOTE,
      })
    }

    console.log(API_LOG_PREFIX.MJ_SUBMITTING_U1)
    const actionResponse = await fetch('https://api.cometapi.com/mj/submit/action', {
      method: HttpMethod.Post,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': ContentType.Json,
      },
      body: JSON.stringify({
        customId: u1Button.customId,
        taskId: imagineTaskId,
      }),
    })

    const actionData = await actionResponse.json()
    console.log(API_LOG_PREFIX.MJ_ACTION_RESPONSE, actionData)

    if (actionData.code !== 1) {
      console.warn(API_LOG_PREFIX.MJ_ACTION_FAILED, actionData.description)
      return NextResponse.json({
        url: imagineResult.imageUrl,
        taskId: imagineTaskId,
        note: API_ERROR.MJ_UPSCALE_VARIATION_FAILED_NOTE,
      })
    }

    const actionTaskId = actionData.result

    console.log(API_LOG_PREFIX.MJ_WAITING_UPSCALE, actionTaskId)
    const upscaleResult = await pollForCompletion(actionTaskId, apiKey, 600)
    console.log(API_LOG_PREFIX.MJ_UPSCALE_COMPLETED, upscaleResult.imageUrl)

    return NextResponse.json({
      url: upscaleResult.imageUrl,
      taskId: actionTaskId,
      originalTaskId: imagineTaskId,
    })
  }),
  { maxRequests: 3, windowMs: 60000 }
)
