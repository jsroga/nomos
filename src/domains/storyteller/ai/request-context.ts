/**
 * Server-trusted request context for storyteller agent runs.
 *
 * IDs and routing choices must never travel through LLM-typed tool arguments
 * (the model can hallucinate or omit them). The API route builds a
 * RequestContext from the authenticated request; tools and workflow steps
 * read it via `context.requestContext` and prefer it over model-supplied
 * input fields.
 *
 * Pure module: constants + tiny helpers only (safe to import from tools,
 * routes, and the workflow without cycles).
 */

import { RequestContext } from '@mastra/core/di'

export const STORYTELLER_PROJECT_ID = 'storyteller.projectId'
export const STORYTELLER_EPISODE_ID = 'storyteller.episodeId'
/** Bible panel that started this Writers Room turn — tools drop off-section writes. */
export const STORYTELLER_BIBLE_SECTION = 'storyteller.bibleSection'
/** When the user asked for episode description / logline only. */
export const STORYTELLER_PREMISE_FIELD = 'storyteller.premiseField'
/**
 * Writers Room composer picker (Kimi / GLM / Opus) — chat adapter only.
 * Does not drive author / planner / critic / muse / premise orchestration.
 */
export const STORYTELLER_CHAT_MODEL = 'storyteller.chatModel'
/**
 * Optional per-request author override for beat-draft / GRRM paths.
 * Not set by the Writers Room chat picker.
 */
export const STORYTELLER_AUTHOR_MODEL = 'storyteller.authorModel'

export interface StorytellerRequestContextInput {
  projectId?: string | null
  episodeId?: string | null
  /** Picker choice for the chat adapter. */
  chatModel?: string | null
  /** Explicit author override (orchestration), not the chat picker. */
  authorModel?: string | null
  bibleSection?: string | null
  premiseField?: string | null
}

/** Build the RequestContext an API route passes into `agent.stream/generate`. */
export function buildStorytellerRequestContext(
  input: StorytellerRequestContextInput
): RequestContext {
  const ctx = new RequestContext()
  if (input.projectId) ctx.set(STORYTELLER_PROJECT_ID, input.projectId)
  if (input.episodeId) ctx.set(STORYTELLER_EPISODE_ID, input.episodeId)
  if (input.chatModel) ctx.set(STORYTELLER_CHAT_MODEL, input.chatModel)
  if (input.authorModel) ctx.set(STORYTELLER_AUTHOR_MODEL, input.authorModel)
  if (input.bibleSection) ctx.set(STORYTELLER_BIBLE_SECTION, input.bibleSection)
  if (input.premiseField) ctx.set(STORYTELLER_PREMISE_FIELD, input.premiseField)
  return ctx
}

/** Read a string value from an (optional) RequestContext without casts. */
export function requestContextString(
  requestContext: RequestContext | undefined,
  key: string
): string | undefined {
  const value = requestContext?.get(key)
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
