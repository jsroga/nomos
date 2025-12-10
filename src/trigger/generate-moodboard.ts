
import { task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import sharp from "sharp";

interface GenerateMoodboardPayload {
    projectId: string;
    prompts: string[];
    styleReference?: string;
    replaceIndex?: number; // Index to update/replace
    providerConfig: {
        provider: 'nanobanana' | 'midjourney';
        apiKey: string;
        modelId?: string;
        styleReferenceUrls?: string[]; // Array of style refs from settings
    };
}

export const generateMoodboard = task({
    id: "generate-moodboard",
    maxDuration: 300, // 5 mins
    run: async (payload: GenerateMoodboardPayload) => {
        const { projectId, prompts, styleReference, providerConfig, replaceIndex } = payload;
        const { provider, apiKey, modelId, styleReferenceUrls } = providerConfig;
        const generatedFilenames: string[] = [];

        console.log(`Starting moodboard generation for project ${projectId} using ${provider}`);

        // Prepare Style References
        // Combine legacy `styleReference` string with new `styleReferenceUrls` array
        const allStyleRefs = [
            ...(styleReference ? [styleReference] : []),
            ...(styleReferenceUrls || [])
        ].filter(Boolean);

        // 1. Generate Images
        for (const prompt of prompts) {
            try {
                let imageBase64: string | null = null;
                // Construct prompt
                let enhancedPrompt = `${prompt}. Concept art, high fidelity, moody, cinematic lighting.`;

                // For Midjourney, we append style reference flags later.

                if (provider === 'midjourney') {
                    // MIDJOURNEY via COMET API
                    console.log("Generating with Midjourney (Comet)...");

                    // 1. Submit Imagine
                    let fullPrompt = `${enhancedPrompt} --v 6.1 --ar 16:9`;

                    // Append Style References (--sref url1 url2)
                    if (allStyleRefs.length > 0) {
                        fullPrompt += ` --sref ${allStyleRefs.join(' ')}`;
                    }

                    const imagineResponse = await fetch('https://api.cometapi.com/mj/submit/imagine', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            prompt: fullPrompt,
                            notifyHook: ''
                        })
                    });

                    if (!imagineResponse.ok) {
                        const err = await imagineResponse.text();
                        console.error(`Comet/MJ Error: ${err}`);
                        continue;
                    }

                    const imagineData = await imagineResponse.json();
                    const taskId = imagineData.result;

                    if (!taskId) {
                        console.error("No Task ID from Comet");
                        continue;
                    }

                    // 2. Poll for Completion
                    const finalUrl = await pollCometTask(taskId, apiKey);
                    if (finalUrl) {
                        const imgRes = await fetch(finalUrl);
                        const arrayBuffer = await imgRes.arrayBuffer();
                        imageBase64 = Buffer.from(arrayBuffer).toString('base64');
                    }

                } else if (provider === 'nanobanana') {
                    // NANO BANANA uses Gemini API for image generation
                    const targetModel = modelId || 'gemini-2.0-flash-preview-image-generation';
                    console.log(`Generating with Nano Banana (Gemini ${targetModel})...`);

                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{ text: enhancedPrompt }]
                            }],
                            generationConfig: {
                                responseModalities: ["TEXT", "IMAGE"]
                            }
                        })
                    });

                    if (!response.ok) {
                        const errText = await response.text();
                        console.error(`Nano Banana API Error (${targetModel}): ${errText}`);
                        continue;
                    }

                    const data = await response.json();

                    // Parse response for image data
                    if (data.candidates?.[0]?.content?.parts) {
                        for (const part of data.candidates[0].content.parts) {
                            if (part.inline_data?.data) {
                                imageBase64 = part.inline_data.data;
                                console.log(`Found image in inline_data`);
                                break;
                            }
                            if (part.inlineData?.data) {
                                imageBase64 = part.inlineData.data;
                                console.log(`Found image in inlineData`);
                                break;
                            }
                        }
                    }

                    if (!imageBase64) {
                        console.warn(`Nano Banana (${targetModel}) did not return an image.`);
                    }
                }

                if (imageBase64) {
                    // 2. Save to Disk
                    const filename = `mood_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
                    const projectDir = path.join(process.cwd(), 'public', 'projects', projectId);

                    if (!fs.existsSync(projectDir)) {
                        fs.mkdirSync(projectDir, { recursive: true });
                    }

                    let buffer: Buffer = Buffer.from(imageBase64, 'base64');

                    // Crop Midjourney images (usually 2x2 grid, we want top-left)
                    if (provider === 'midjourney') {
                        try {
                            const image = sharp(buffer);
                            const metadata = await image.metadata();
                            if (metadata.width && metadata.height) {
                                // Crop to top-left quadrant
                                const newWidth = Math.floor(metadata.width / 2);
                                const newHeight = Math.floor(metadata.height / 2);
                                console.log(`Cropping Midjourney grid (${metadata.width}x${metadata.height}) to top-left (${newWidth}x${newHeight})`);
                                buffer = await image
                                    .extract({ left: 0, top: 0, width: newWidth, height: newHeight })
                                    .toBuffer();
                            }
                        } catch (cropError) {
                            console.error("Failed to crop Midjourney image:", cropError);
                            // Proceed with original buffer if cropping fails
                        }
                    }

                    fs.writeFileSync(path.join(projectDir, filename), buffer);
                    generatedFilenames.push(filename);
                    console.log(`Saved ${filename}`);
                }

            } catch (error) {
                console.error(`Failed to generate image for prompt: ${prompt}`, error);
            }
        }

        // 3. Update Database with retry logic for concurrent updates
        if (generatedFilenames.length > 0) {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            // Retry logic to handle concurrent updates
            const maxRetries = 3;
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    // Always fetch fresh data before updating to handle concurrent modifications
                    const { data: project } = await supabase
                        .from('projects')
                        .select('series_bible')
                        .eq('id', projectId)
                        .single();

                    if (!project || !project.series_bible) {
                        console.error("Project or series_bible not found");
                        break;
                    }

                    let currentImages = (project.series_bible as any).moodImages || [];
                    let newImages: string[];

                    if (typeof replaceIndex === 'number' && replaceIndex >= 0) {
                        // Replace mode - update specific index
                        console.log(`Replacing image at index ${replaceIndex}`);
                        newImages = [...currentImages];
                        // Ensure array is large enough (fill gaps if needed)
                        while (newImages.length <= replaceIndex) newImages.push("");

                        // Update the specific slot
                        if (generatedFilenames[0]) {
                            newImages[replaceIndex] = generatedFilenames[0];
                        }
                    } else {
                        // Append mode (legacy/initial generation)
                        newImages = [...currentImages, ...generatedFilenames];
                    }

                    const { error } = await supabase
                        .from('projects')
                        .update({
                            series_bible: {
                                ...project.series_bible,
                                moodImages: newImages
                            }
                        })
                        .eq('id', projectId);

                    if (error) {
                        console.error(`Update attempt ${attempt + 1} failed:`, error);
                        if (attempt < maxRetries - 1) {
                            // Wait briefly before retry
                            await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
                            continue;
                        }
                    } else {
                        console.log(`Updated DB with moodImages (index: ${replaceIndex ?? 'append'})`);
                        break;
                    }
                } catch (dbError) {
                    console.error(`Database error on attempt ${attempt + 1}:`, dbError);
                    if (attempt < maxRetries - 1) {
                        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
                    }
                }
            }
        }

        return {
            success: true,
            images: generatedFilenames
        };
    },
});

async function pollCometTask(taskId: string, apiKey: string, maxAttempts = 60): Promise<string | null> {
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 5000)); // Poll every 5s
        try {
            const res = await fetch(`https://api.cometapi.com/mj/task/${taskId}/fetch`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (!res.ok) continue;
            const data = await res.json();
            const result = data.result || data;

            if (result.status === 'SUCCESS') {
                return result.imageUrl;
            }
            if (result.status === 'FAILED') {
                console.error('MJ Task Failed:', result.failReason);
                return null;
            }
        } catch (e) {
            console.error("Polling error", e);
        }
    }
    return null;
}
