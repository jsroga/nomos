import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import type { SeriesBible } from '@/domains/storyteller/services/context/series-bible'
import { API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { openRouterClientConfig } from '@/shared/agent-kernel/models'
import { resolveUserPickerOpenRouterModelId } from '@/domains/storyteller/config/constants/model-config'
import { buildContextSnippet } from './world-summary-content'

const WORLD_GEN_SYSTEM_PROMPT = `You are a visual art director writing style descriptions for isometric tilemap generation.
Your output is used as a Midjourney/Stable Diffusion style prompt suffix.

Rules:
- Write EXACTLY 1-2 sentences, no more.
- Focus on small physical details: surface textures, lighting quality, material wear, ambient atmosphere, colour temperature.
- Do NOT mention any game titles, franchise names, or IP names.
- Do NOT repeat the world's title or setting name.
- Do NOT use "isometric", "tilemap", "game", "2D", "tile" — those are added elsewhere.
- Output ONLY the style sentences, nothing else.`

function resolveWorldGenModel() {
  const openRouter = openRouterClientConfig()
  return createOpenAI({ apiKey: openRouter.apiKey, baseURL: openRouter.baseURL })(
    resolveUserPickerOpenRouterModelId()
  )
}

function cleanGeneratedPrompt(text: string): string {
  return text.trim().replace(/^["']|["']$/g, '')
}

export async function generateWorldGenPrompt(
  bible: SeriesBible,
  fallbackPrompt: string,
): Promise<string> {
  const contextSnippet = buildContextSnippet(bible)
  if (!contextSnippet.trim()) return fallbackPrompt

  try {
    const { text } = await generateText({
      model: resolveWorldGenModel(),
      system: WORLD_GEN_SYSTEM_PROMPT,
      prompt: `World context:
${contextSnippet}

Write 1-2 sentences describing the small visual details and atmosphere that should define this world's art style.`,
      maxOutputTokens: 120,
      temperature: 0.7,
    })

    const cleaned = cleanGeneratedPrompt(text)
    if (cleaned.length > 10) return cleaned
    return fallbackPrompt
  } catch (error) {
    console.warn(API_LOG_PREFIX.WORLD_SUMMARY_AI_FALLBACK, error)
    return fallbackPrompt
  }
}
