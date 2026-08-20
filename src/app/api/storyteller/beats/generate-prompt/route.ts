import { NextRequest, NextResponse } from 'next/server'
import { createStorytellerAgent } from '@/domains/storyteller/server'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { HttpStatus } from '@/shared/data/constants/protocol'
import {
  StorytellerAnswerSeparator,
  StorytellerBeatTypeFallback,
  StorytellerPromptAgentInstruction,
  StorytellerPromptTemplateToken,
  StorytellerSettingFallback,
} from '@/domains/storyteller/core/storyteller-page-wire'
import {
  loadBeatEpisodeLock,
  readBeatId,
} from '@/domains/storyteller/services/beat-image-prompt-context'
import { readString, recordFromJson } from '@/shared/data/json-guards'

const PROMPT_GENERATOR_SYSTEM = `You are a Visual Director for a film. 
Your task is to take a story beat and convert it into a vivid, specific visual image prompt for an AI image generator.

THE BEAT:
${StorytellerPromptTemplateToken.BeatContent}

CONTEXT:
Beat Type: ${StorytellerPromptTemplateToken.BeatType}
Characters: ${StorytellerPromptTemplateToken.Characters}
Visual Hook: ${StorytellerPromptTemplateToken.VisualHook}
Setting: ${StorytellerPromptTemplateToken.Setting}
${StorytellerPromptTemplateToken.CanonLock}

INSTRUCTIONS:
- Create a SINGLE, detailed image prompt.
- Focus on lighting, composition, and atmosphere.
- If a "Visual Hook" is provided, make it the center of the image.
- Keep it under 50 words.
- Style: Rough white-and-dark storyboard sketch, high contrast, cinematic framing.
- Goal: Pick the single best frame that represents this beat's action.
- Stay consistent with the canon lock. Do not invent a different episode plot.
- output ONLY the prompt string. No "Prompt:" prefix.`

function involvedCharacterNames(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value
    .filter((name): name is string => typeof name === 'string')
    .join(StorytellerAnswerSeparator.CommaSpace)
}

export const POST = withAuth(async (req: NextRequest, { session }: AuthenticatedRequest) => {
  try {
    const body = recordFromJson(await req.json())
    const beat = body.beat
    const projectIdHint = readString(body.projectId)
    const beatId = readBeatId(beat)

    if (!beat || !beatId) {
      return NextResponse.json({ error: API_ERROR.MISSING_BEAT_DATA }, { status: HttpStatus.BAD_REQUEST })
    }

    const lookup = await loadBeatEpisodeLock({
      beatId,
      ...(projectIdHint ? { projectIdHint } : {}),
      userId: session.user.id,
    })
    if (!lookup.ok) {
      return NextResponse.json(
        { error: API_ERROR.PROJECT_ACCESS_DENIED },
        { status: HttpStatus.NOT_FOUND }
      )
    }

    const beatRecord = recordFromJson(beat)
    const mazur = recordFromJson(beatRecord.mazurElements)
    const agent = await createStorytellerAgent()

    const promptInput = PROMPT_GENERATOR_SYSTEM.replace(
      StorytellerPromptTemplateToken.BeatContent,
      `${readString(beatRecord.logline) ?? ''}${
        Object.keys(mazur).length > 0 ? `\nDetails: ${JSON.stringify(mazur)}` : ''
      }`
    )
      .replace(
        StorytellerPromptTemplateToken.BeatType,
        readString(beatRecord.beatType) || StorytellerBeatTypeFallback.Scene
      )
      .replace(StorytellerPromptTemplateToken.Characters, involvedCharacterNames(beatRecord.charactersInvolved))
      .replace(StorytellerPromptTemplateToken.VisualHook, readString(beatRecord.visualHook) ?? '')
      .replace(
        StorytellerPromptTemplateToken.Setting,
        readString(mazur.setting) || StorytellerSettingFallback.Unknown
      )
      .replace(StorytellerPromptTemplateToken.CanonLock, lookup.lock)

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
      { status: HttpStatus.INTERNAL }
    )
  }
})
