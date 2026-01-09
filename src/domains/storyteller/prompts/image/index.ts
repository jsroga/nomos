/**
 * Storyteller Image Generation Prompts
 * 
 * Central location for all image generation prompts used in the storyteller module.
 */

/**
 * Portrait Generation Prompt Template
 * Used by: generate-portrait.ts trigger
 * Provider: Midjourney via Comet API
 */
export const buildPortraitPrompt = (characterDescription: string, srefParam: string = '') => {
    return `portrait of ${characterDescription}, professional headshot, high quality, detailed --ar 1:1 ${srefParam}`.trim()
}

/**
 * Poster Generation Prompt Template (Midjourney)
 * Used by: generate-poster.ts trigger
 * Provider: Midjourney via LegNext API
 */
export const buildPosterPrompt = (episodeDescription: string, srefParam: string = '') => {
    return `movie poster for ${episodeDescription}, cinematic lighting, high resolution, detailed, textless --ar 2:3 ${srefParam}`.trim()
}

/**
 * Episode Poster Prompt Enhancement (Gemini)
 * Used by: generate-episode-poster.ts trigger
 * Provider: Gemini via Nano Banana
 */
export const enhanceEpisodePosterPrompt = (basePrompt: string) => {
    return `${basePrompt}. Movie poster style, cinematic composition, dramatic lighting, high resolution, highly detailed, vertical aspect ratio.`
}

/**
 * Combined Storyboard Prompt Template
 * Used by: generate-combined-storyboard.ts trigger
 * Provider: Gemini via Nano Banana
 * 
 * Creates a "Story Book Wireframe" / "Visual Script" layout image.
 */
export const buildCombinedStoryboardPrompt = (beats: { logline: string; visualHook?: string; imagePrompt?: string }[]) => {
    const scenesDescription = beats.map((b, i) => {
        const desc = b.imagePrompt || b.visualHook || b.logline
        return `[Panel ${i + 1}]: ${desc}`
    }).join('\n')

    return `
Role: You are a technical artist creating a single "Story Book Wireframe" or "Visual Script" layout.
Task: Create ONE large image that acts as a wireframe summary of the entire episode's visual flow.

Style & Format:
- STYLE: Wireframe / Sketch / Architectural Storyboard.
- FORMAT: A single image containing multiple "panels" or "vignettes" arranged in a logical flow (e.g., a grid, a winding path, or a comic-book layout).
- CONTENT: You MUST include a distinct visual representation for EACH of the beat descriptions provided below.
- LOOK: Clean lines, blueprint aesthetic or rough pencil sketch. Not a realistic movie poster.
- DIRECTIVE: Do it like Christopher Nolan would do. Complex, non-linear, cerebral, and visually grand.

Input Beat Descriptions (Visualize ALL of these in the single image):
${scenesDescription}

Execution:
- Do not make separate images.
- Bundle all these scenes into one cohesive "Story Map" or "Wireframe" image.
- Labeling or numbering the beats visually within the image is encouraged.

Output: A single high-resolution Board/Map image.
`.trim()
}
