import {
  createVisualSubjectClient,
  generateVisualSubjects,
} from '@/domains/storyteller/services/visual-subject-llm'
import { VisualSubjectKind } from '@/domains/storyteller/services/constants/visual-overview'
import {
  isVisualOverviewReady,
  type VisualOverviewContext,
} from '@/domains/storyteller/services/visual-overview-context'
import {
  buildEpisodePosterPrompt,
  EpisodePosterPromptLock,
} from './constants/episode-poster-prompt'
import { GeneratePosterError } from './constants/generate-poster-wire'

export function lockedPosterPromptOrNull(prompt: string | undefined): string | null {
  const trimmed = prompt?.trim() ?? ''
  if (trimmed.startsWith(EpisodePosterPromptLock.Prefix)) return trimmed
  return null
}

export async function buildLockedEpisodePosterPrompt(input: {
  context: VisualOverviewContext
  extraPrompt: string
}): Promise<string> {
  const openai = createVisualSubjectClient()
  if (!openai) throw new Error(GeneratePosterError.OpenRouterRequired)
  if (!isVisualOverviewReady(input.context)) {
    throw new Error(GeneratePosterError.OverviewRequired)
  }
  const extra = input.extraPrompt.trim()
  const fallbackSource = extra || input.context.worldDesc
  const [scene] = await generateVisualSubjects(openai, {
    context: input.context,
    extra,
    kind: VisualSubjectKind.Poster,
    fallbacks: [fallbackSource],
  })
  const locked = scene ? buildEpisodePosterPrompt(scene) : null
  if (!locked) throw new Error(GeneratePosterError.PromptBuildFailed)
  return locked
}
