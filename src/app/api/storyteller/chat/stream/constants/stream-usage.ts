/** Log lines for streamed-call accounting. */

export const STREAM_USAGE_LOG = {
  NoUsageReported:
    '[gateway] chat stream ended without the provider reporting usage; the call is unrecorded rather than written in at zero cost.',
} as const

/**
 * Field names a provider may use for token counts. They disagree by SDK
 * version, so a finish chunk is read against each in order.
 */
export const USAGE_PROMPT_FIELDS = ['inputTokens', 'promptTokens'] as const
export const USAGE_COMPLETION_FIELDS = ['outputTokens', 'completionTokens'] as const
