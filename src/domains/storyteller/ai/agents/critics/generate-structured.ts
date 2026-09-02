/**
 * Run an agent with Mastra structuredOutput and return the parsed object.
 * Schema-invalid output returns null rather than throwing — a flaky extract
 * must never take down the caller.
 */

import { meteredCall } from '@/shared/ai/gateway/agent'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import '@/shared/data/server-guard'
import type { Agent } from '@mastra/core/agent'
import type { z } from 'zod'
import {
  BeatDraftStructuredOutputErrorStrategy,
  BeatDraftToolChoice,
} from '@/domains/storyteller/ai/workflows/constants/beat-draft-workflow'

export async function generateStructured<T>(
  agent: Agent,
  prompt: string,
  schema: z.ZodType<T>
): Promise<T | null> {
  const response = await meteredCall(LlmFeature.StorytellerBeatPlan, () => agent.generate(prompt, {
    toolChoice: BeatDraftToolChoice.None,
    structuredOutput: {
      schema,
      errorStrategy: BeatDraftStructuredOutputErrorStrategy.Warn,
    },
  }))
  const parsed = schema.safeParse(response.object)
  return parsed.success ? parsed.data : null
}
