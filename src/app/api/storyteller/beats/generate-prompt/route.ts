import { NextRequest, NextResponse } from 'next/server'
import { createStorytellerAgent } from '@/domains/storyteller/server'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  StorytellerAnswerSeparator,
  StorytellerBeatTypeFallback,
  StorytellerPromptAgentInstruction,
  StorytellerPromptTemplateToken,
  StorytellerSettingFallback,
} from '@/domains/storyteller/core/storyteller-page-wire'

const PROMPT_GENERATOR_SYSTEM = `You are a Visual Director for a film. 
Your task is to take a story beat and convert it into a vivid, specific visual image prompt for an AI image generator.

THE BEAT:
${StorytellerPromptTemplateToken.BeatContent}

CONTEXT:
Beat Type: ${StorytellerPromptTemplateToken.BeatType}
Characters: ${StorytellerPromptTemplateToken.Characters}
Visual Hook: ${StorytellerPromptTemplateToken.VisualHook}
Setting: ${StorytellerPromptTemplateToken.Setting}

INSTRUCTIONS:
- Create a SINGLE, detailed image prompt.
- Focus on lighting, composition, and atmosphere.
- If a "Visual Hook" is provided, make it the center of the image.
- Keep it under 50 words.
- Style: Rough white-and-dark storyboard sketch, high contrast, cinematic framing.
- Goal: Pick the single best frame that represents this beat's action.
- output ONLY the prompt string. No "Prompt:" prefix.`

export const POST = withAuth(async (req: NextRequest, _auth: AuthenticatedRequest) => {
  try {
    const { beat } = await req.json()

    if (!beat) {
      return NextResponse.json({ error: API_ERROR.MISSING_BEAT_DATA }, { status: 400 })
    }

    const agent = await createStorytellerAgent()

    const promptInput = PROMPT_GENERATOR_SYSTEM.replace(
      StorytellerPromptTemplateToken.BeatContent,
      beat.logline + (beat.mazurElements ? `\nDetails: ${JSON.stringify(beat.mazurElements)}` : '')
    )
      .replace(
        StorytellerPromptTemplateToken.BeatType,
        beat.beatType || StorytellerBeatTypeFallback.Scene
      )
      .replace(
        StorytellerPromptTemplateToken.Characters,
        (beat.charactersInvolved || []).join(StorytellerAnswerSeparator.CommaSpace)
      )
      .replace(StorytellerPromptTemplateToken.VisualHook, beat.visualHook || '')
      .replace(
        StorytellerPromptTemplateToken.Setting,
        beat.mazurElements?.setting || StorytellerSettingFallback.Unknown
      )

    const imagePrompt = await agent.run(
      StorytellerPromptAgentInstruction.GenerateImagePrompt,
      promptInput + StorytellerPromptAgentInstruction.GenerateImagePromptSuffix
    )

    return NextResponse.json({ prompt: imagePrompt })
  } catch (error) {
    console.error(API_LOG_PREFIX.PROMPT_GENERATION_FAILED, error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : API_ERROR.FAILED_GENERATE_PROMPT,
      },
      { status: 500 }
    )
  }
})
