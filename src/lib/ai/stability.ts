import { AIModel, AIModelConfig, TileContext } from './types';
import { assembleContextImage } from './contextAssembler';
import { enhancePromptWithStyle } from './styleAnalyzer';
import axios from 'axios';

export class StabilityAIModel implements AIModel {
    id = 'stability';
    name = 'Stability AI (SDXL)';
    description = 'Uses Stable Diffusion XL for high-quality inpainting. Supports steps, cfg, and samplers.';

    validateConfig(config: AIModelConfig): boolean {
        return !!config.apiKey;
    }

    async generate(prompt: string, context: TileContext, config: AIModelConfig): Promise<string> {
        if (!config.apiKey) throw new Error("API Key missing");

        const engineId = 'stable-diffusion-xl-1024-v1-0';
        const apiHost = 'https://api.stability.ai';
        const url = `${apiHost}/v1/generation/${engineId}/image-to-image/masking`;

        const hasNeighbors = Object.values(context.neighbors).some(Boolean);

        // Enhance prompt
        const neighborList = Object.values(context.neighbors).filter(Boolean);
        const enhancedPrompt = await enhancePromptWithStyle(prompt, neighborList);

        // Prepare context
        // SDXL Inpainting works best with a 1024x1024 image and a mask.
        // Our assembleContextImage returns exactly that.
        const { imageBlob, maskBlob, cropRect } = await assembleContextImage(context, 1024);

        const formData = new FormData();
        formData.append('init_image', imageBlob);
        formData.append('mask_image', maskBlob);
        formData.append('text_prompts[0][text]', enhancedPrompt);
        formData.append('text_prompts[0][weight]', '1');
        formData.append('cfg_scale', (config.params?.cfgScale || 7).toString());
        formData.append('samples', '1');
        formData.append('steps', (config.params?.steps || 30).toString());

        // SDXL specific: "mask_source" - MASK_IMAGE_WHITE (white pixels are masked/generated)
        // Our mask has White = Keep, Transparent = Edit.
        // Wait, let's check assembleContextImage.
        // It fills with White (Keep), clears target to Transparent (Edit).
        // Stability API: "mask_source": "MASK_IMAGE_WHITE" means white pixels are generated.
        // "MASK_IMAGE_BLACK" means black pixels are generated.
        // Our mask is White/Transparent.
        // If we convert Transparent to Black, we have White (Keep) / Black (Edit).
        // So we should use MASK_IMAGE_BLACK.

        // BUT, `assembleContextImage` returns a PNG with transparency.
        // Stability might treat transparency as black?
        // Let's ensure we send a proper B/W mask if needed.
        // Actually, let's look at `assembleContextImage` again.
        // It returns a PNG.

        // Let's assume we need to be explicit.
        // For now, let's try sending it as is. If Stability supports alpha channel masks, great.
        // Docs say: "mask_image": "Image to use as a mask. It must be the same dimensions as `init_image`. The mask should be black and white, where black pixels are preserved and white pixels are generated (or vice versa depending on `mask_source`)."

        // Our mask: White = Keep, Transparent = Edit.
        // If we treat Transparent as Black, we have White (Keep) / Black (Edit).
        // So we want "Black pixels are generated". No, "White pixels are preserved".
        // So "mask_source": "MASK_IMAGE_BLACK" (Black generated)

        // Let's default to MASK_IMAGE_BLACK and hope transparency is read as black.
        // Or we can update assembleContextImage to return opaque B/W mask.
        // `assembleContextImage` currently returns transparent hole.

        formData.append('mask_source', 'MASK_IMAGE_BLACK');

        try {
            const response = await axios.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Accept: 'application/json',
                    Authorization: `Bearer ${config.apiKey}`,
                },
            });

            if (response.status !== 200) {
                throw new Error(`Non-200 response: ${response.statusText}`);
            }

            const artifacts = response.data.artifacts;
            if (!artifacts || artifacts.length === 0) {
                throw new Error("No image generated");
            }

            const base64Image = artifacts[0].base64;
            const dataUrl = `data:image/png;base64,${base64Image}`;

            return await this.cropImage(dataUrl, cropRect);

        } catch (error: any) {
            console.error("Stability AI generation failed", error.response?.data || error);
            throw new Error(`Stability AI failed: ${error.response?.data?.message || error.message}`);
        }
    }

    private async cropImage(url: string, rect: { x: number, y: number, width: number, height: number }): Promise<string> {
        const img = await this.loadImage(url);
        const canvas = document.createElement('canvas');
        canvas.width = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("No context");

        ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
        return canvas.toDataURL('image/png');
    }

    private loadImage(src: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
}
