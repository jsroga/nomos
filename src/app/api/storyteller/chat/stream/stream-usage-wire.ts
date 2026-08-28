/**
 * Records what a streamed chat turn cost.
 *
 * The chat stream is the single largest spender in the product, and its
 * `usage` arrives in a `finish` chunk *after* the response has been sent — so
 * it cannot be recorded by wrapping the call the way a non-streaming
 * completion is.
 */
import { recordLlmCall } from '@/shared/ai/gateway/record'
import { LlmFeature, LlmOutcome } from '@/shared/ai/gateway/constants/llm-call'
import { OPENROUTER_PROVIDER } from '@/shared/ai/gateway/constants/provider'
import { STREAM_USAGE_LOG } from './constants/stream-usage'
import type { StreamSession } from './stream-session-wire'

/**
 * Called on every exit from the stream, including a client disconnect — an
 * abandoned generation still cost money.
 *
 * When the provider never reported usage the call is **left unrecorded** and
 * logged. A zero-token row would appear in `npm run spend` as a free
 * generation, which is worse than a gap someone can see in the log.
 */
export async function recordStreamedCall(session: StreamSession): Promise<void> {
  if (!session.scope) return

  if (!session.usage) {
    console.warn(`${STREAM_USAGE_LOG.NoUsageReported} traceId=${session.traceId}`)
    return
  }

  await recordLlmCall({
    traceId: session.traceId,
    projectId: session.scope.projectId,
    userId: session.scope.userId,
    feature: LlmFeature.StorytellerChat,
    model: session.model ?? '',
    provider: OPENROUTER_PROVIDER,
    promptTokens: session.usage.promptTokens,
    completionTokens: session.usage.completionTokens,
    latencyMs: 0,
    outcome: LlmOutcome.Ok,
  })
}
