import fs from 'fs'
import path from 'path'
import { logger } from '@trigger.dev/sdk/v3'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import {
  BufferEncoding,
  ContentType,
  FsDirectory,
  GoogleModelId,
  HttpMethod,
} from '@/shared/data/constants/protocol'
import { GeminiResponseModality } from '@/shared/data/constants/repaint-gemini'

interface StoryboardBeat {
  logline: string
  visualHook?: string
  imagePrompt?: string
}

export function buildCombinedStoryboardPrompt(beats: StoryboardBeat[]): string {
  const scenesDescription = beats
    .map((b, i) => {
      const desc = b.imagePrompt || b.visualHook || b.logline
      return `[Panel ${i + 1}]: ${desc}`
    })
    .join('\n')

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

export async function fetchGeminiStoryboardImage(apiKey: string, prompt: string): Promise<string> {
  const targetModel = GoogleModelId.Gemini3ProImagePreview

  logger.info('Generating combined image with Nano Banana (Gemini)', { model: targetModel })

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
    {
      method: HttpMethod.Post,
      headers: { 'Content-Type': ContentType.Json },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: [GeminiResponseModality.Text, GeminiResponseModality.Image],
        },
      }),
    }
  )

  if (!response.ok) {
    const errText = await response.text()
    logger.error('Gemini API Error', { error: errText })
    throw new Error(`Gemini API Error: ${errText}`)
  }

  const data = await response.json()
  const imageBase64 = extractInlineImageBase64(data)
  if (!imageBase64) {
    throw new Error('No image data returned from Gemini API')
  }
  return imageBase64
}

function extractInlineImageBase64(data: {
  candidates?: Array<{ content?: { parts?: Array<{ inline_data?: { data?: string }; inlineData?: { data?: string } }> } }>
}): string | null {
  const parts = data.candidates?.[0]?.content?.parts
  if (!parts) return null

  for (const part of parts) {
    if (part.inline_data?.data) return part.inline_data.data
    if (part.inlineData?.data) return part.inlineData.data
  }
  return null
}

export function saveStoryboardImage(projectId: string, episodeId: string, imageBase64: string): string {
  const filename = `combined_storyboard_${episodeId}_${Date.now()}.png`
  const projectDir = path.join(
    process.cwd(),
    FsDirectory.Public,
    FsDirectory.Projects,
    projectId,
  )

  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true })
  }

  const buffer = Buffer.from(imageBase64, BufferEncoding.Base64)
  fs.writeFileSync(path.join(projectDir, filename), buffer)
  logger.info('Combined image saved to disk', { filename })
  return filename
}

export async function persistEpisodeStoryboardUrl(
  episodeId: string,
  filename: string,
  prompt: string
): Promise<void> {
  const supabase = createSupabaseServiceClient()

  const { data: episodeData, error: fetchError } = await supabase
    .from('episodes')
    .select('story_plan')
    .eq('id', episodeId)
    .single()

  if (fetchError || !episodeData) {
    logger.error(`Failed to fetch episode for update: ${fetchError?.message}`)
    return
  }

  const currentPlan = episodeData.story_plan || {}
  const updatedPlan = {
    ...currentPlan,
    storyboardUrl: filename,
    storyboardPrompt: prompt,
  }

  const { error: updateError } = await supabase
    .from('episodes')
    .update({ story_plan: updatedPlan })
    .eq('id', episodeId)

  if (updateError) {
    logger.error(`Failed to update episode story_plan: ${updateError.message}`)
    return
  }

  logger.info('Episode story_plan updated with storyboardUrl')
}
