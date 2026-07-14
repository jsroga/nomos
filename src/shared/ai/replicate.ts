import Replicate from 'replicate'
import { z } from 'zod'
import {
  ReplicateClientLog,
  ReplicateTextureParam,
} from '@/shared/ai/constants/replicate-client'

// Singleton client cache - reuse clients with same API key
const clientCache = new Map<string, Replicate>()

function getReplicateClient(apiKey: string): Replicate {
  if (!clientCache.has(apiKey)) {
    clientCache.set(apiKey, new Replicate({ auth: apiKey }))
  }
  return clientCache.get(apiKey)!
}

// Schema for Replicate SAM-2 output
const ReplicateSAM2Schema = z.object({
  individual_masks: z.array(z.any()).optional(),
  masks: z.array(z.any()).optional(),
  scores: z.array(z.number()).optional(),
  logits: z.array(z.any()).optional(),
}).passthrough()

export class ReplicateClient {
  private replicate: Replicate

  constructor(apiKey: string) {
    this.replicate = getReplicateClient(apiKey)
  }

  async segmentObject(
    image: string, // base64 or url
    _points: Array<{ x: number; y: number; label: number }> // We won't send these to the model, but we need them for filtering later
  ): Promise<any> {
    // meta/sam-2 is an Automatic Mask Generator. It ignores points.
    // We just send the image.
    const input = {
      image,
      use_m2m: true, // Match Replicate's sample input
      // We can tune these for performance vs quality
      points_per_side: 32,
      pred_iou_thresh: 0.88,
      stability_score_thresh: 0.95,
    }

    const output = await this.replicate.run(
      'meta/sam-2:fe97b453a6455861e3bac769b441ca1f1086110da7466dbb65cf1eecfd60dc83',
      { input }
    )

    console.log(ReplicateClientLog.RawOutput, JSON.stringify(output, null, 2))

    // Validate output structure instead of blind casting
    const parsed = ReplicateSAM2Schema.safeParse(output)
    if (!parsed.success) {
      console.warn(ReplicateClientLog.UnexpectedFormat, parsed.error)
      // Fallback to returning raw output but logged warning
      return output
    }

    const typedOutput = parsed.data

    if (typedOutput?.individual_masks && typedOutput.individual_masks.length > 0) {
      console.log(ReplicateClientLog.FirstMaskType, typeof typedOutput.individual_masks[0])
      console.log(
        ReplicateClientLog.FirstMaskKeys,
        Object.keys(typedOutput.individual_masks[0] || {})
      )
      console.log(ReplicateClientLog.FirstMask, typedOutput.individual_masks[0])
    }
    return output
  }
  async generateTexture(prompt: string): Promise<string> {
    const input = {
      prompt: `seamless texture of ${prompt}, top down view, flat lighting, high quality, 8k, disco elysium style, oil painting style`,
      negative_prompt: ReplicateTextureParam.NegativePrompt,
      width: 1024,
      height: 1024,
      refine: ReplicateTextureParam.Refine,
      scheduler: ReplicateTextureParam.Scheduler,
      lora_scale: 0.6,
      num_outputs: 1,
      guidance_scale: 7.5,
      apply_watermark: false,
      high_noise_frac: 0.8,
    }

    const output = await this.replicate.run(
      'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      { input }
    )

    console.log(ReplicateClientLog.TextureOutput, output)

    if (Array.isArray(output) && output.length > 0) {
      return output[0]
    }
    return String(output)
  }
}
