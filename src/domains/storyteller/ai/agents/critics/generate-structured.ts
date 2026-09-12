/**
 * Run an agent with Mastra structuredOutput and return the parsed object.
 * Schema-invalid output returns null rather than throwing — a flaky extract
 * must never take down the caller.
 */

import { meteredCall } from '@/shared/ai/gateway/agent'
import { currentGatewayContext } from '@/shared/ai/gateway/call-context'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { withMastraSpan } from '@/shared/observability/mastra-tracing'
import '@/shared/data/server-guard'
import type { Agent } from '@mastra/core/agent'
import type { z } from 'zod'
import { createMastraTraceId } from '@/domains/storyteller/ai/tracing'
import { GenerateStructuredSpan } from '@/domains/storyteller/ai/agents/critics/constants/critic-agents'
import {
  BeatDraftStructuredOutputErrorStrategy,
  BeatDraftToolChoice,
} from '@/domains/storyteller/ai/workflows/constants/beat-draft-workflow'

function structuredGenerateSpanName(agent: Agent): string {
  if (agent.id.length > 0) return agent.id
  return GenerateStructuredSpan.Default
}

export async function generateStructured<T>(
  agent: Agent,
  prompt: string,
  schema: z.ZodType<T>
): Promise<T | null> {
  const traceId = currentGatewayContext()?.traceId ?? createMastraTraceId()
  const response = await withMastraSpan(traceId, structuredGenerateSpanName(agent), span =>
    meteredCall(LlmFeature.StorytellerBeatPlan, () =>
      agent.generate(prompt, {
        toolChoice: BeatDraftToolChoice.None,
        structuredOutput: {
          schema,
          errorStrategy: BeatDraftStructuredOutputErrorStrategy.Warn,
        },
        tracingOptions: {
          traceId,
          ...(span.spanId ? { parentSpanId: span.spanId } : {}),
        },
      })
    )
  )
  const parsed = schema.safeParse(response.object)
  return parsed.success ? parsed.data : null
}
