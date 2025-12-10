import { task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

interface GeneratePortraitPayload {
    prompt: string;
    projectId: string;
    characterId: string;
    apiKey: string;
    styleReferenceUrls?: string[];
}

export const generatePortrait = task({
    id: "generate-portrait",
    maxDuration: 300, // 5 mins
    run: async (payload: GeneratePortraitPayload) => {
        const { prompt, projectId, characterId, apiKey, styleReferenceUrls } = payload;

        console.log(`Starting portrait generation for character ${characterId}, prompt: ${prompt.substring(0, 50)}...`);

        if (!apiKey) {
            throw new Error("Comet API key is required");
        }

        if (!projectId || !characterId) {
            throw new Error("projectId and characterId are required");
        }

        // Build --sref parameter from URLs if present
        let srefParam = "";
        if (styleReferenceUrls && styleReferenceUrls.length > 0) {
            srefParam = `--sref ${styleReferenceUrls.join(' ')}`;
        }

        const fullPrompt = `portrait of ${prompt}, professional headshot, high quality, detailed --ar 1:1 ${srefParam}`;

        // 1. Submit Imagine Task to Comet API
        console.log("Submitting imagine task to Comet API...");
        const submitResponse = await fetch('https://api.cometapi.com/mj/submit/imagine', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                botType: 'MID_JOURNEY',
                prompt: fullPrompt,
                accountFilter: {
                    modes: ['FAST'],
                },
            }),
        });

        if (!submitResponse.ok) {
            const errText = await submitResponse.text();
            throw new Error(`Comet API Error: ${errText}`);
        }

        const submitData = await submitResponse.json();

        if (submitData.code !== 1) {
            throw new Error(submitData.description || 'Failed to submit imagine task');
        }

        const taskId = submitData.result;
        console.log(`Task submitted to Comet. Task ID: ${taskId}`);

        // 2. Poll for Completion
        const maxAttempts = 60; // 5 minutes (5s * 60)

        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(r => setTimeout(r, 5000)); // Poll every 5s

            try {
                const res = await fetch(`https://api.cometapi.com/mj/task/${taskId}/fetch`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });

                if (!res.ok) {
                    console.warn(`Polling failed with status ${res.status}`);
                    continue;
                }

                const data = await res.json();
                const result = data.result || data; // Handle potential different response structures

                // Check status
                if (result.status === 'SUCCESS') {
                    console.log("Generation successful:", result.imageUrl);

                    // 3. Download image from MJ URL
                    const imgResponse = await fetch(result.imageUrl);
                    if (!imgResponse.ok) {
                        throw new Error(`Failed to download image from MJ: ${imgResponse.status}`);
                    }
                    const arrayBuffer = await imgResponse.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    // 4. Save to disk
                    const filename = `portrait_${characterId}_${Date.now()}.png`;
                    const projectDir = path.join(process.cwd(), 'public', 'projects', projectId, 'portraits');

                    if (!fs.existsSync(projectDir)) {
                        fs.mkdirSync(projectDir, { recursive: true });
                    }

                    const filePath = path.join(projectDir, filename);
                    fs.writeFileSync(filePath, buffer);
                    console.log(`Portrait saved to ${filePath}`);

                    // 5. Update character in database
                    const localPath = `portraits/${filename}`;
                    const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                    );

                    const { error: dbError } = await supabase
                        .from('characters')
                        .update({ portrait_url: localPath })
                        .eq('id', characterId);

                    if (dbError) {
                        console.error("Failed to update character in DB:", dbError);
                        // Don't throw - the image was saved successfully
                    } else {
                        console.log(`Character ${characterId} portrait_url updated to ${localPath}`);
                    }

                    return {
                        success: true,
                        imageUrl: result.imageUrl,
                        localPath: localPath,
                        taskId: taskId,
                        characterId: characterId
                    };
                } else if (result.status === 'FAILED' || result.status === 'FAILURE') {
                    throw new Error(`Generation failed: ${result.failReason || 'Unknown reason'}`);
                }

                // If PROCESSING, IN_QUEUE etc, continue loop
                console.log(`Status: ${result.status} (${result.progress || 0}%)`);

            } catch (pollError) {
                // If it's the error we threw above, rethrow it to stop the loop
                if (pollError instanceof Error && pollError.message.startsWith('Generation failed')) {
                    throw pollError;
                }
                if (pollError instanceof Error && pollError.message.startsWith('Failed to download')) {
                    throw pollError;
                }
                console.error("Error during polling:", pollError);
                // Don't throw immediately for network errors, try again
            }
        }

        throw new Error("Generation timed out");
    },
});
