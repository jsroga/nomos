import Replicate from 'replicate'

export class ReplicateClient {
  private replicate: Replicate

  constructor(apiKey: string) {
    this.replicate = new Replicate({
      auth: apiKey,
    })
  }

  async segmentObject(
    image: string, // base64 or url
    points: Array<{ x: number; y: number; label: number }> // We won't send these to the model, but we need them for filtering later
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

    console.log('[ReplicateClient] Raw output:', JSON.stringify(output, null, 2))
    console.log('[ReplicateClient] Output type:', typeof output)
    console.log('[ReplicateClient] Output keys:', Object.keys(output || {}))
    const typedOutput = output as any
    if (typedOutput?.individual_masks && typedOutput.individual_masks.length > 0) {
      console.log('[ReplicateClient] First mask type:', typeof typedOutput.individual_masks[0])
      console.log(
        '[ReplicateClient] First mask keys:',
        Object.keys(typedOutput.individual_masks[0] || {})
      )
      console.log('[ReplicateClient] First mask:', typedOutput.individual_masks[0])
    }
    return output
  }
  async generateTexture(prompt: string): Promise<string> {
    const input = {
      prompt: `seamless texture of ${prompt}, top down view, flat lighting, high quality, 8k, disco elysium style, oil painting style`,
      negative_prompt: 'text, watermark, low quality, blurred, distorted, perspective, shadows',
      width: 1024,
      height: 1024,
      refine: 'expert_ensemble_refiner',
      scheduler: 'K_EULER',
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

    console.log('[ReplicateClient] Texture output:', output)

    if (Array.isArray(output) && output.length > 0) {
      return output[0]
    }
    return String(output)
  }
}

export class ReplicateAIModel {
  private replicate: Replicate
  private model: string

  constructor(apiKey: string, model: string) {
    this.replicate = new Replicate({ auth: apiKey })
    this.model = model
  }

  async upscale(image: string, prompt: string, creativity: number): Promise<string> {
    // Basic implementation to satisfy build.
    // Actual params depend on the specific model used for upscaling.
    const output = await this.replicate.run(this.model as any, {
      input: {
        image: image.startsWith('data:') ? image : `data:image/png;base64,${image}`,
        prompt,
        creativity,
      },
    })
    return String(output)
  }
}
