/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable indent */
import { Tile, useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { supabase } from '@/infrastructure/storage/supabase'
import { NanoBananaProModel } from '@/infrastructure/ai/nanoBanana'
import { stabilityAI } from '@/infrastructure/ai/stability'
import { ReplicateAIModel } from '@/infrastructure/ai/replicate'

export class UpscaleService {
    async upscale(tile: Tile, creativity: number): Promise<void> {
        console.log('Upscaling tile', tile.id, 'creativity', creativity)

        // Track upscaling status
        useWorldStore.getState().addUpscalingTile(tile.x, tile.y)

        try {
            // 0. Get Configs
            let nanoConfig = { apiKey: '', model: '' }

            if (typeof window !== 'undefined') {
                const savedNano = localStorage.getItem('ai-config-nano-banana')
                if (savedNano) nanoConfig = JSON.parse(savedNano)
            }

            if (!nanoConfig.apiKey) throw new Error('Nano Banana Pro API Key not found')

            const nanoBanana = new NanoBananaProModel(nanoConfig.apiKey, nanoConfig.model)

            // 1. Get Image URL
            const imageUrl = `/projects/${tile.project_id}/${tile.image_filename}`

            // 2. Fetch Image Blob
            const response = await fetch(imageUrl)
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`)
            const blob = await response.blob()

            // 3. Convert to Base64
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve((reader.result as string).split(',')[1])
                reader.readAsDataURL(blob)
            })

            // 4. Step 1: Upscale to 1024px using Nano Banana Pro
            console.log('Step 1: Upscaling to 1024px with Nano Banana Pro...')
            const upscaled1024Base64 = await nanoBanana.upscale(base64, tile.tile_prompt, creativity)

            // Check for Replicate config
            let replicateConfig = { apiKey: '', model: '' }
            if (typeof window !== 'undefined') {
                const savedReplicate = localStorage.getItem('ai-config-replicate')
                if (savedReplicate) replicateConfig = JSON.parse(savedReplicate)
            }

            // Check if Stability API key is available
            let stabilityConfig = { apiKey: '' }
            if (typeof window !== 'undefined') {
                const savedStability = localStorage.getItem('ai-config-stability')
                if (savedStability) stabilityConfig = JSON.parse(savedStability)
            }

            // Determine which provider to use for Step 2
            // We can add a setting for "Upscaler Provider", or just check which key is present.
            // Let's assume we want to support explicit selection if we had a global setting, 
            // but for now let's prioritize Replicate if configured, else Stability.
            // Or better, let's read the "active upscaler" from settings if we had one.
            // Since we are adding a selector in SettingsDialog, we should store that preference.
            // Let's assume we store it in 'ai-config-upscaler-provider' or similar.

            let activeUpscaler = 'stability'
            if (typeof window !== 'undefined') {
                activeUpscaler = localStorage.getItem('ai-active-upscaler') || 'stability'
            }

            let finalImageData = upscaled1024Base64
            let finalFilenameSuffix = '_upscaled_gemini.png'

            if (activeUpscaler === 'replicate' && replicateConfig.apiKey) {
                // 5. Step 2: Upscale with Replicate
                console.log('Step 2: Upscaling with Replicate...')
                try {
                    const replicate = new ReplicateAIModel(replicateConfig.apiKey, replicateConfig.model)
                    // Replicate models might handle large inputs better, but let's see.
                    // If we pass 1024x1024, it should be fine for most creative upscalers.

                    const upscaledReplicateBase64 = await replicate.upscale(upscaled1024Base64, tile.tile_prompt, creativity)

                    if (upscaledReplicateBase64) {
                        finalImageData = upscaledReplicateBase64
                        finalFilenameSuffix = '_upscaled_replicate.png'
                    }
                } catch (replicateError) {
                    console.error('Replicate upscale failed:', replicateError)
                    console.warn('Falling back to Gemini result')
                }

            } else if (stabilityConfig.apiKey) {
                // 5. Step 2: Upscale to 4k using Stability AI
                console.log('Step 2: Upscaling to 4k with Stability AI...')

                try {
                    // Stability's latent upscaler has a max input size of 512x768
                    // We need to resize the Gemini output (likely 1024x1024) down to 512x512
                    console.log('Resizing Gemini output to 512x512 for Stability compatibility...')

                    const resized512Base64 = await this.resizeImage(upscaled1024Base64, 512, 512)

                    // Get upscale mode from config (conservative or creative)
                    const upscaleMode = (stabilityConfig as { apiKey: string, upscaleMode?: 'conservative' | 'creative' }).upscaleMode || 'conservative'

                    // We use the stability config stored in localStorage or pass it if needed.
                    // StabilityAIModel.upscale4k handles config retrieval internally if not passed.
                    const upscaled4kBase64 = await stabilityAI.upscale4k(resized512Base64, undefined, upscaleMode)

                    if (upscaled4kBase64) {
                        finalImageData = upscaled4kBase64
                        finalFilenameSuffix = '_upscaled_4k.png'
                    } else {
                        console.warn('Stability upscale returned no data, falling back to Gemini result')
                    }
                } catch (stabilityError) {
                    console.error('Stability AI upscale failed:', stabilityError)
                    console.warn('Falling back to Gemini result due to Stability error')
                    // finalImageData remains as upscaled1024Base64
                    // finalFilenameSuffix remains as '_upscaled_gemini.png'
                }
            } else {
                console.log('Skipping Step 2 (Stability/Replicate) - No API Key found or provider not selected. Saving Gemini result.')
            }

            // 6. Save New Image
            const newFilename = tile.image_filename.replace('.png', finalFilenameSuffix)

            // Save locally
            const saveResponse = await fetch('/api/save-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: tile.project_id,
                    filename: newFilename,
                    imageData: finalImageData.replace(/^data:image\/\w+;base64,/, ''),
                }),
            })

            if (!saveResponse.ok) throw new Error('Failed to save upscaled image')

            // 7. Update Tile Record
            const { error } = await supabase
                .from('tiles')
                .update({ image_filename: newFilename })
                .eq('id', tile.id)

            if (error) throw error

            // 8. Update Store
            const { tiles } = useWorldStore.getState()
            const tileKey = `${tile.x},${tile.y}`
            if (tiles[tileKey]) {
                useWorldStore.setState(state => ({
                    tiles: {
                        ...state.tiles,
                        [tileKey]: { ...state.tiles[tileKey], image_filename: newFilename }
                    }
                }))
            }
        } catch (error) {
            console.error('Upscale error:', error)
            throw error
        } finally {
            // Remove upscaling status
            useWorldStore.getState().removeUpscalingTile(tile.x, tile.y)
        }
    }

    private async resizeImage(base64Image: string, targetWidth: number, targetHeight: number): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = targetWidth
                canvas.height = targetHeight
                const ctx = canvas.getContext('2d')

                if (!ctx) {
                    reject(new Error('Failed to get canvas context'))
                    return
                }

                // Draw image scaled to target size
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

                // Convert to base64 (without prefix)
                const resized = canvas.toDataURL('image/png').split(',')[1]
                resolve(resized)
            }
            img.onerror = reject

            // Handle both with and without data URL prefix
            const imageData = base64Image.startsWith('data:')
                ? base64Image
                : `data:image/png;base64,${base64Image}`
            img.src = imageData
        })
    }
}

export const upscaleService = new UpscaleService()
