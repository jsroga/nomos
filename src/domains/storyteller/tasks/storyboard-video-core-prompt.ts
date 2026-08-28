import { createVisualSubjectClient } from '@/domains/storyteller/tasks/constants/visual-subject-client'
import { OpenAiChatRole } from '@/shared/data/constants/protocol'
import { TEXT_GEN_FAST_MODEL } from '@/shared/agent-kernel/models'
import { ApiframeVideoModel } from '@/shared/ai/constants/apiframe'
import { StoryboardVideoLook } from '@/shared/ai/storyboard-video-env'
import {
  StoryboardCorePromptSource,
  STORYBOARD_CORE_PROMPT_TEMPERATURE,
  applyStoryboardLookPrompt,
  buildStoryboardCorePromptUser,
  buildStoryboardVideoPrompt,
  capStoryboardCorePrompt,
  storyboardCoreSystemPrompt,
  type StoryboardVideoBeatText,
} from './constants/storyboard-video-prompt'

export interface StoryboardCorePromptCompleteInput {
  system: string
  user: string
}

export type StoryboardCorePromptComplete = (
  input: StoryboardCorePromptCompleteInput,
) => Promise<string>

export interface StoryboardCorePromptResult {
  prompt: string
  source: StoryboardCorePromptSource
}

async function defaultStoryboardCoreComplete(
  input: StoryboardCorePromptCompleteInput,
): Promise<string> {
  const openai = createVisualSubjectClient()
  if (!openai) return ''
  const response = await openai.chat.completions.create({
    model: TEXT_GEN_FAST_MODEL,
    temperature: STORYBOARD_CORE_PROMPT_TEMPERATURE,
    messages: [
      { role: OpenAiChatRole.System, content: input.system },
      { role: OpenAiChatRole.User, content: input.user },
    ],
  })
  return response.choices[0]?.message?.content?.trim() ?? ''
}

export async function generateStoryboardVideoCorePrompt(
  beats: StoryboardVideoBeatText[],
  complete: StoryboardCorePromptComplete = defaultStoryboardCoreComplete,
  look: StoryboardVideoLook = StoryboardVideoLook.Storyboard,
  model: ApiframeVideoModel = ApiframeVideoModel.Kling30,
): Promise<StoryboardCorePromptResult> {
  const fallback = buildStoryboardVideoPrompt(beats, look, model)
  try {
    const raw = await complete({
      system: storyboardCoreSystemPrompt(look),
      user: buildStoryboardCorePromptUser(beats),
    })
    const summarized = capStoryboardCorePrompt(raw)
    if (summarized.length === 0) {
      return { prompt: fallback, source: StoryboardCorePromptSource.Fallback }
    }
    return {
      prompt: applyStoryboardLookPrompt(summarized, look, model),
      source: StoryboardCorePromptSource.Llm,
    }
  } catch {
    return { prompt: fallback, source: StoryboardCorePromptSource.Fallback }
  }
}
