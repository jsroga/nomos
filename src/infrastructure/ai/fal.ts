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

export class FalClient {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async segmentObject(
    imageDataUri: string, // data:image/png;base64,...
    box: { x1: number; y1: number; x2: number; y2: number }, // pixel coordinates
    textPrompt?: string, // optional text prompt like "car", "person", etc.
    params?: SamParams // optional SAM parameters
  ): Promise<any> {
    const boxPrompt: BoxPrompt = {
      x_min: Math.floor(Math.min(box.x1, box.x2)),
      y_min: Math.floor(Math.min(box.y1, box.y2)),
      x_max: Math.floor(Math.max(box.x1, box.x2)),
      y_max: Math.floor(Math.max(box.y1, box.y2)),
    }

    const input: Record<string, any> = {
      image_url: imageDataUri,
      box_prompts: [boxPrompt],
      apply_mask: false, // We want the RLE, not the masked image
      return_multiple_masks: params?.returnMultipleMasks ?? false,
      include_scores: params?.includeScores ?? true,
      include_boxes: params?.includeBoxes ?? true,
    }

    // Add text prompt if provided
    if (textPrompt && textPrompt.trim()) {
      input.text_prompt = textPrompt.trim()
    }

    console.log('[FalClient] Calling SAM-3 with:', {
      imageLength: imageDataUri.length,
      box: boxPrompt,
      textPrompt: textPrompt || '(none)',
      params,
    })

    const response = await fetch('https://fal.run/fal-ai/sam-3/image-rle', {
      method: 'POST',
      headers: {
        Authorization: `Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...input }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[FalClient] API Error:', errorText)
      throw new Error(`Fal.ai SAM-3 API failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('[FalClient] Raw output:', JSON.stringify(data, null, 2))
    return data
  }
}
