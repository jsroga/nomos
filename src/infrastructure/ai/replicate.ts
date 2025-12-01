/* eslint-disable indent */
import axios from 'axios'

export class ReplicateAIModel {
    private apiKey: string
    private model: string

    constructor(apiKey: string, model: string = 'recraft-ai/recraft-creative-upscale') {
        this.apiKey = apiKey
        this.model = model
    }

    async upscale(
        base64Image: string,
        prompt: string,
        creativity: number = 0.5
    ): Promise<string> {
        if (!this.apiKey) throw new Error('Replicate API Key missing')

        // 1. Create Prediction
        // 1. Create Prediction

        // Convert base64 to data URI
        const imageUri = `data:image/png;base64,${base64Image}`

        const input = {
            image: imageUri,
            prompt: prompt,
            creativity: creativity, // Adjust based on specific model params
            // Add other model-specific params here if needed
            // For recraft-creative-upscale, check specific params. 
            // Assuming 'creativity' maps to something like 'style_strength' or similar if 'creativity' isn't exact.
            // Let's assume standard params for now or adjust if we find specific docs.
            // Recraft usually takes 'style' or 'substyle'. 
            // If using 'recraft-ai/recraft-creative-upscale', it might just need image and prompt.
            // Let's try to pass 'creativity' as 'style_strength' if applicable, or just rely on prompt.
            // Actually, let's stick to a generic input structure and refine if it fails.
        }

        // For Recraft specifically, let's check if we can find the version or just use the model name if supported by API (some endpoints support model name directly)
        // Replicate API usually requires version for 'predictions' endpoint unless using 'models/{owner}/{name}/predictions'

        // Let's use the deployments/models endpoint if possible, but standard is predictions with version.
        // Since we don't have the version hash hardcoded, we might need to fetch it or use the model-owner format if the API supports it (it does for some).
        // Safer to just use the `models/owner/name/predictions` endpoint which resolves version automatically.

        const predictionUrl = `https://api.replicate.com/v1/models/${this.model}/predictions`

        try {
            const response = await axios.post(
                predictionUrl,
                { input },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        Prefer: 'wait', // Wait for a few seconds to see if it finishes quickly
                    },
                }
            )

            let prediction = response.data

            // Poll if not completed
            while (
                prediction.status !== 'succeeded' &&
                prediction.status !== 'failed' &&
                prediction.status !== 'canceled'
            ) {
                await new Promise((resolve) => setTimeout(resolve, 2000))
                const statusResponse = await axios.get(
                    prediction.urls.get,
                    {
                        headers: {
                            Authorization: `Bearer ${this.apiKey}`,
                        },
                    }
                )
                prediction = statusResponse.data
            }

            if (prediction.status !== 'succeeded') {
                throw new Error(`Replicate prediction failed: ${prediction.error || prediction.status}`)
            }

            // Output is usually a URL or array of URLs
            const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output

            if (!outputUrl) throw new Error('No output URL from Replicate')

            // Download the image and convert to base64
            const imageResponse = await axios.get(outputUrl, { responseType: 'arraybuffer' })
            const base64 = Buffer.from(imageResponse.data, 'binary').toString('base64')

            return base64

        } catch (error: unknown) {
            console.error('Replicate API failed:', error)
            const message = error instanceof Error ? error.message : String(error)
            throw new Error(`Replicate upscale failed: ${message}`)
        }
    }

    private async getModelVersion(_modelStr: string): Promise<string> {
        // Helper if we ever need to fetch explicit version.
        // For now we use the model endpoint which handles it.
        return ''
    }
}
