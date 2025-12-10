
import { NextResponse } from 'next/server';
import { tasks } from '@trigger.dev/sdk/v3';
import { generateMoodboard } from '@/trigger/generate-moodboard';
import { db } from '@/lib/db';
import { projects } from '@/domains/storyteller/db/schema';
import { eq } from 'drizzle-orm';
import { StoryPlan } from '@/domains/storyteller/schemas/agent-schemas';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { projectId, providerConfig, styleReference, promptIndex } = await req.json();

        if (!projectId) {
            return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }

        // Fetch Project Bible Data and Settings
        const project = await db.query.projects.findFirst({
            where: eq(projects.id, projectId)
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Get style references from project settings
        const styleReferenceUrls = (project.styleReferenceUrls as any) || [];
        if (styleReference) {
            styleReferenceUrls.push(styleReference);
        }

        // Get bible data
        const bible = (project.seriesBible || {}) as Partial<StoryPlan>;
        const projectTitle = bible.title || project.name || 'Untitled Project';
        const genre = bible.genre || 'Unknown genre';
        const tone = bible.tone || 'atmospheric';
        const worldDesc = bible.worldDescription || project.description || projectTitle;

        // Define Prompt Types
        const promptTypes = [
            "Wide establishing shot of the main environment, focusing on scale and atmosphere.",
            "Close up detail of a significant object, tool, or artifact unique to this world.",
            "Street level or interior view showing daily life and culture.",
            "Portrait of a typical inhabitant or faction member, highlighting attire and traits."
        ];

        let prompts: string[] = [];

        try {
            // Generate Prompts with OpenAI
            let systemPrompt = `You are a creative director for a film or game project. Generate 4 distinct, highly visual image generation prompts for an AI art generator (like Midjourney or Imagen).
Project: ${projectTitle}
Genre: ${genre}
Tone: ${tone}
World Description: ${worldDesc}

The prompts should correspond to these categories:
1. Environment/Landscape
2. Key Object/Artifact
3. Daily Life/Scene
4. Character Portrait

Output ONLY the 4 prompts as a JSON array of strings. Do not include markdown formatting or numbering.`;

            if (typeof promptIndex === 'number' && promptIndex >= 0 && promptIndex < 4) {
                systemPrompt = `You are a creative director. Generate ONE highly visual image generation prompt for:
Project: ${projectTitle}
Genre: ${genre}
Tone: ${tone}
World Description: ${worldDesc}

The prompt must be for the category: "${promptTypes[promptIndex]}"

Output ONLY the single prompt string.`;
            }

            const gptResponse = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'system', content: systemPrompt }],
                temperature: 0.7,
            });

            const content = gptResponse.choices[0]?.message?.content?.trim() || "";

            if (typeof promptIndex === 'number' && promptIndex >= 0 && promptIndex < 4) {
                prompts = [content.replace(/^"|"$/g, '')]; // Remove quotes if present
            } else {
                // Try parsing JSON array
                try {
                    // Remove markdown code blocks if present
                    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
                    prompts = JSON.parse(cleanContent);
                } catch (e) {
                    console.warn("Failed to parse GPT prompts as JSON, falling back to manual construction", e);
                    // Fallback mechanism if JSON parse fails
                    prompts = [
                        `Movie concept art, ${projectTitle}, ${genre}, ${tone}. ${worldDesc}. Wide environment shot.`,
                        `Movie concept art, ${projectTitle}, ${genre}, ${tone}. ${worldDesc}. Key artifact close-up.`,
                        `Movie concept art, ${projectTitle}, ${genre}, ${tone}. ${worldDesc}. Daily life scene.`,
                        `Movie concept art, ${projectTitle}, ${genre}, ${tone}. ${worldDesc}. Character portrait.`
                    ];
                }
            }

        } catch (openaiError) {
            console.error("OpenAI Prompt Generation failed:", openaiError);
            // Fallback to static prompts
            const baseContext = `Project: ${projectTitle}. Genre: ${genre}. Tone: ${tone}. World: ${worldDesc}.`;
            const allPrompts = [
                `${baseContext} Wide establishing shot of the main environment. Grand scale.`,
                `${baseContext} Close up detail of a significant object or artifact. Texture focused.`,
                `${baseContext} Street level view of daily life in this world. Atmospheric.`,
                `${baseContext} Portrait of a typical inhabitant or faction member. Character study.`
            ];

            if (typeof promptIndex === 'number' && promptIndex >= 0 && promptIndex < allPrompts.length) {
                prompts = [allPrompts[promptIndex]];
            } else {
                prompts = allPrompts;
            }
        }

        // Trigger the Task
        const handle = await tasks.trigger("generate-moodboard", {
            projectId,
            prompts,
            styleReference: undefined,
            replaceIndex: typeof promptIndex === 'number' ? promptIndex : undefined, // NEW: Tell task which index to replace
            providerConfig: {
                ...providerConfig,
                styleReferenceUrls // Pass all URLs here
            }
        });

        return NextResponse.json({
            success: true,
            handleId: handle.id
        });

    } catch (error) {
        console.error('Failed to trigger moodboard generation:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
