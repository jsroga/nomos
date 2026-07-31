import type OpenAI from 'openai'
import { API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { OpenAiChatRole } from '@/shared/data/constants/protocol'
import { TEXT_GEN_FAST_MODEL } from '@/shared/agent-kernel/models'
import {
  StorytellerMoodboardDefault,
  StorytellerMoodboardPromptCategory,
} from '@/domains/storyteller/core/storyteller-page-wire'

export interface MoodboardProjectContext {
  projectTitle: string
  genre: string
  tone: string
  worldDesc: string
}

const MOODBOARD_PROMPT_TYPES = [
  StorytellerMoodboardPromptCategory.Environment,
  StorytellerMoodboardPromptCategory.DailyLife,
  StorytellerMoodboardPromptCategory.CharacterPortrait,
] as const

function buildMoodboardSystemPrompt(context: MoodboardProjectContext, promptIndex?: number): string {
  const { projectTitle, genre, tone, worldDesc } = context
  const base = `Project: ${projectTitle}\nGenre: ${genre}\nTone: ${tone}\nWorld Description: ${worldDesc}`

  if (typeof promptIndex === 'number' && promptIndex >= 0 && promptIndex < 3) {
    return `You are a creative director. Generate ONE highly visual image generation prompt for:
${base}

The prompt must be for the category: "${MOODBOARD_PROMPT_TYPES[promptIndex]}"

Output ONLY the single prompt string.`
  }

  return `You are a creative director for a film or game project. Generate 3 distinct, highly visual image generation prompts for an AI art generator (like Midjourney or Imagen).
${base}

The prompts should correspond to these categories:
1. Environment/Landscape
2. Daily Life/Scene
3. Character Portrait

Output ONLY the 3 prompts as a JSON array of strings. Do not include markdown formatting or numbering.`
}

function buildFallbackPrompts(context: MoodboardProjectContext, promptIndex?: number): string[] {
  const baseContext = `Project: ${context.projectTitle}. Genre: ${context.genre}. Tone: ${context.tone}. World: ${context.worldDesc}.`
  const allPrompts = [
    `${baseContext} Wide establishing shot of the main environment. Grand scale.`,
    `${baseContext} Street level view of daily life in this world. Atmospheric.`,
    `${baseContext} Portrait of a typical inhabitant or faction member. Character study.`,
  ]

  if (typeof promptIndex === 'number' && promptIndex >= 0 && promptIndex < allPrompts.length) {
    return [allPrompts[promptIndex]]
  }
  return allPrompts
}

function parsePromptArrayContent(content: string, context: MoodboardProjectContext): string[] {
  try {
    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleanContent)
  } catch (error) {
    console.warn(API_LOG_PREFIX.MOODBOARD_GPT_PARSE_FALLBACK, error)
    return [
      `Movie concept art, ${context.projectTitle}, ${context.genre}, ${context.tone}. ${context.worldDesc}. Wide environment shot.`,
      `Movie concept art, ${context.projectTitle}, ${context.genre}, ${context.tone}. ${context.worldDesc}. Daily life scene.`,
      `Movie concept art, ${context.projectTitle}, ${context.genre}, ${context.tone}. ${context.worldDesc}. Character portrait.`,
    ]
  }
}

export async function generateMoodboardPrompts(
  openai: OpenAI,
  context: MoodboardProjectContext,
  promptIndex?: number,
): Promise<string[]> {
  try {
    const gptResponse = await openai.chat.completions.create({
      model: TEXT_GEN_FAST_MODEL,
      messages: [{ role: OpenAiChatRole.System, content: buildMoodboardSystemPrompt(context, promptIndex) }],
      temperature: 0.7,
    })

    const content = gptResponse.choices[0]?.message?.content?.trim() || ''

    if (typeof promptIndex === 'number' && promptIndex >= 0 && promptIndex < 3) {
      return [content.replace(/^"|"$/g, '')]
    }

    return parsePromptArrayContent(content, context)
  } catch (openaiError) {
    console.error(API_LOG_PREFIX.MOODBOARD_OPENAI_FAILED, openaiError)
    return buildFallbackPrompts(context, promptIndex)
  }
}

export function buildMoodboardProjectContext(input: {
  projectName?: string | null
  projectDescription?: string | null
  bibleTitle?: string
  bibleGenre?: string
  bibleTone?: string
  bibleWorldDescription?: string
}): MoodboardProjectContext {
  return {
    projectTitle: input.bibleTitle ?? input.projectName ?? StorytellerMoodboardDefault.UntitledProject,
    genre: input.bibleGenre ?? StorytellerMoodboardDefault.UnknownGenre,
    tone: input.bibleTone ?? StorytellerMoodboardDefault.AtmosphericTone,
    worldDesc:
      input.bibleWorldDescription ??
      input.projectDescription ??
      input.bibleTitle ??
      StorytellerMoodboardDefault.UntitledProject,
  }
}
