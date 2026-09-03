import { complete } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { jobContextScope } from '@/shared/auth/project-scope'
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
  projectId: string | undefined,
): Promise<string> {
  if (!projectId) return ''
  const { text } = await complete({
    scope: jobContextScope(projectId),
    feature: LlmFeature.StorytellerVisualSubject,
    model: TEXT_GEN_FAST_MODEL,
    system: input.system,
    prompt: input.user,
    temperature: STORYBOARD_CORE_PROMPT_TEMPERATURE,
  })
  return text.trim()
}

export async function generateStoryboardVideoCorePrompt(
  beats: StoryboardVideoBeatText[],
  completeFn?: StoryboardCorePromptComplete,
  look: StoryboardVideoLook = StoryboardVideoLook.Storyboard,
  model: ApiframeVideoModel = ApiframeVideoModel.Kling30,
  projectId?: string,
): Promise<StoryboardCorePromptResult> {
  const fallback = buildStoryboardVideoPrompt(beats, look, model)
  const runComplete =
    completeFn ?? ((input: StoryboardCorePromptCompleteInput) => defaultStoryboardCoreComplete(input, projectId))
  try {
    const raw = await runComplete({
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
