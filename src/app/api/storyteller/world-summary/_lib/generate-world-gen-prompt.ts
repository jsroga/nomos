import type { ProjectScope } from '@/shared/auth/project-scope'
import { complete } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import type { SeriesBible } from '@/domains/storyteller/services/context/series-bible'
import { API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
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

function cleanGeneratedPrompt(text: string): string {
  return text.trim().replace(/^["']|["']$/g, '')
}

export async function generateWorldGenPrompt(
  bible: SeriesBible,
  fallbackPrompt: string,
  scope: ProjectScope,
): Promise<string> {
  const contextSnippet = buildContextSnippet(bible)
  if (!contextSnippet.trim()) return fallbackPrompt

  try {
    const { text } = await complete({
      scope,
      feature: LlmFeature.StorytellerWorldGenPrompt,
      model: resolveUserPickerOpenRouterModelId(),
      system: WORLD_GEN_SYSTEM_PROMPT,
      prompt: `World context:
${contextSnippet}

Write 1-2 sentences describing the small visual details and atmosphere that should define this world's art style.`,
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
