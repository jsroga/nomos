import {
  FAL_API_ERROR_LOG_PREFIX,
  FAL_HTTP_METHOD_POST,
  FAL_RAW_OUTPUT_LOG_PREFIX,
  FAL_SAM_CALL_LOG_PREFIX,
  FalSamEndpoint,
  FalSamInputField,
  resolveSamPrompt,
} from '@/shared/ai/constants/fal'
import { ContentType } from '@/shared/data/constants/protocol'

export interface BoxPrompt {
  x_min: number
  y_min: number
  x_max: number
  y_max: number
}

export interface SamParams {
  returnMultipleMasks?: boolean
  includeScores?: boolean
  includeBoxes?: boolean
}

export { resolveSamPrompt }

export class FalClient {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async segmentObject(
    imageDataUri: string,
    box: { x1: number; y1: number; x2: number; y2: number },
    textPrompt?: string,
    params?: SamParams
  ): Promise<unknown> {
    const boxPrompt: BoxPrompt = {
      x_min: Math.floor(Math.min(box.x1, box.x2)),
      y_min: Math.floor(Math.min(box.y1, box.y2)),
      x_max: Math.floor(Math.max(box.x1, box.x2)),
      y_max: Math.floor(Math.max(box.y1, box.y2)),
    }

    const prompt = resolveSamPrompt(textPrompt)
    const input: Record<string, unknown> = {
      [FalSamInputField.ImageUrl]: imageDataUri,
      [FalSamInputField.BoxPrompts]: [boxPrompt],
      [FalSamInputField.ApplyMask]: false,
      [FalSamInputField.ReturnMultipleMasks]: params?.returnMultipleMasks ?? false,
      [FalSamInputField.IncludeScores]: params?.includeScores ?? true,
      [FalSamInputField.IncludeBoxes]: params?.includeBoxes ?? true,
      [FalSamInputField.Prompt]: prompt,
    }

    console.log(FAL_SAM_CALL_LOG_PREFIX, {
      imageLength: imageDataUri.length,
      box: boxPrompt,
      textPrompt: prompt,
      params,
    })

    const response = await fetch(FalSamEndpoint.ImageRle, {
      method: FAL_HTTP_METHOD_POST,
      headers: {
        Authorization: `Key ${this.apiKey}`,
        'Content-Type': ContentType.Json,
      },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(FAL_API_ERROR_LOG_PREFIX, errorText)
      throw new Error(`Fal.ai SAM-3 API failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(FAL_RAW_OUTPUT_LOG_PREFIX, JSON.stringify(data, null, 2))
    return data
  }
}
