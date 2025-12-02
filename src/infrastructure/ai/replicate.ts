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
            stability_score_thresh: 0.95
        }

        const output = await this.replicate.run(
            "meta/sam-2:fe97b453a6455861e3bac769b441ca1f1086110da7466dbb65cf1eecfd60dc83",
            { input }
        )

        console.log('[ReplicateClient] Raw output:', JSON.stringify(output, null, 2))
        console.log('[ReplicateClient] Output type:', typeof output)
        console.log('[ReplicateClient] Output keys:', Object.keys(output || {}))
        if (output?.individual_masks && output.individual_masks.length > 0) {
            console.log('[ReplicateClient] First mask type:', typeof output.individual_masks[0])
            console.log('[ReplicateClient] First mask keys:', Object.keys(output.individual_masks[0] || {}))
            console.log('[ReplicateClient] First mask:', output.individual_masks[0])
        }
        return output
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
                creativity
            }
        })
        return String(output)
    }
}
