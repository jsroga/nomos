/**
 * Loop-creator specialist completion: Mastra `agent.generate` with tracing,
 * gateway `complete` only as a catch. Studio Traces require generate + hex
 * `tracingOptions.traceId` — hex only, not the flag-off `complete()` path.
 */

import { meteredCall } from '@/shared/ai/gateway/agent'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { currentGatewayContext } from '@/shared/ai/gateway/call-context'
import '@/shared/data/server-guard'
import type { BaseMessage } from '@/shared/chat/core/message'
import type { ProjectScope } from '@/shared/auth/project-scope'
import { complete, completeStructured } from '@/shared/ai/gateway'
import type { ZodType } from 'zod'
import { withMastraSpan } from '@/shared/observability/mastra-tracing'
import { createMastraTraceId } from '@/shared/observability/mastra-trace-id'
import { FeatureFlag, isFeatureEnabled } from '@/shared/data/feature-flags'
import {
  resolveLoopCreatorModel,
  resolveLoopCreatorMastraModel,
} from '../../../config/model-config'
import {
  LoopCreatorMastraAgentId,
  loopCreatorMastraAgentById,
} from './loop-creator-mastra-agents'
import { getPublishedAgentOr } from '@/shared/agent-kernel/mastra/get-published-agent'

const COMPLETION_SPAN_PREFIX = 'loop-creator.completion.'
const FALLBACK_USER_PROMPT = 'Proceed.'
const HISTORY_HEADER = 'Recent conversation:'
const ROLE_ASSISTANT = 'assistant'
const ROLE_SYSTEM = 'system'
const ROLE_USER = 'user'
export enum LoopCreatorStructuredOutputErrorStrategy {
  Warn = 'warn',
}

/** Whether the legacy flag is on — traces no longer wait on this. */
export function isLoopCreatorMastraEnabled(): boolean {
  return isFeatureEnabled(FeatureFlag.LoopCreatorMastra)
}

function roleLabel(message: BaseMessage): string {
  switch (message._getType()) {
    case 'ai':
      return ROLE_ASSISTANT
    case 'system':
      return ROLE_SYSTEM
    default:
      return ROLE_USER
  }
}

function flattenHistory(messages: BaseMessage[]): string {
  if (messages.length === 0) return ''
  const lines = messages.map(message => {
    const content =
      typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
    return `[${roleLabel(message)}]: ${content}`
  })
  return `${HISTORY_HEADER}\n${lines.join('\n')}`
}

export interface LoopCreatorCompletionParams {
  agentId: LoopCreatorMastraAgentId
  systemPrompt: string
  history?: BaseMessage[]
  userPrompt?: string
  temperature: number
  modelOverride?: string
  traceId?: string
  parentSpanId?: string
  scope: ProjectScope
}

function resolveCompletionPrompt(params: LoopCreatorCompletionParams): string {
  const historyText = flattenHistory(params.history ?? [])
  const promptParts: string[] = []
  if (historyText) promptParts.push(historyText)
  if (params.userPrompt) promptParts.push(params.userPrompt)
  return promptParts.length > 0 ? promptParts.join('\n\n') : FALLBACK_USER_PROMPT
}

function resolveTraceId(params: LoopCreatorCompletionParams): string {
  return params.traceId ?? currentGatewayContext()?.traceId ?? createMastraTraceId()
}

function generateExtras(params: LoopCreatorCompletionParams, spanId: string | undefined) {
  const parentSpanId = spanId ?? params.parentSpanId
  return {
    instructions: params.systemPrompt,
    modelSettings: { temperature: params.temperature },
    tracingOptions: {
      traceId: resolveTraceId(params),
      ...(parentSpanId ? { parentSpanId } : {}),
    },
    ...(params.modelOverride
      ? { model: resolveLoopCreatorMastraModel(params.modelOverride) }
      : {}),
  }
}

export async function runLoopCreatorMastraCompletion(
  params: LoopCreatorCompletionParams
): Promise<string> {
  const codeAgent = loopCreatorMastraAgentById[params.agentId]
  const agent = await getPublishedAgentOr(params.agentId, codeAgent)
  const traceId = resolveTraceId(params)

  return withMastraSpan(
    traceId,
    `${COMPLETION_SPAN_PREFIX}${params.agentId}`,
    async span => {
      const prompt = resolveCompletionPrompt(params)
      const response = await meteredCall(LlmFeature.LoopCreator, () =>
        agent.generate(prompt, generateExtras(params, span.spanId))
      )
      return response.text
    },
    { agentId: params.agentId, temperature: params.temperature }
  )
}

async function runLoopCreatorDirectCompletion(
  params: LoopCreatorCompletionParams
): Promise<string> {
  const history = params.userPrompt
    ? params.userPrompt
    : (params.history ?? [])
        .map(message => `${message.role}: ${message.content}`)
        .join('\n\n')
  const traceId = resolveTraceId(params)

  return withMastraSpan(
    traceId,
    `${COMPLETION_SPAN_PREFIX}${params.agentId}`,
    async () => {
      const { text } = await complete({
        scope: params.scope,
        feature: LlmFeature.LoopCreator,
        model: resolveLoopCreatorModel(params.modelOverride),
        system: params.systemPrompt,
        prompt: history,
        temperature: params.temperature,
        traceId,
      })
      return text
    },
    { agentId: params.agentId, temperature: params.temperature }
  )
}

export async function runLoopCreatorCompletion(
  params: LoopCreatorCompletionParams
): Promise<string> {
  try {
    return await runLoopCreatorMastraCompletion(params)
  } catch {
    return runLoopCreatorDirectCompletion(params)
  }
}

export interface LoopCreatorStructuredCompletionParams<T> extends LoopCreatorCompletionParams {
  schema: ZodType<T>
}

async function runLoopCreatorMastraStructuredCompletion<T>(
  params: LoopCreatorStructuredCompletionParams<T>
): Promise<T | null> {
  const codeAgent = loopCreatorMastraAgentById[params.agentId]
  const agent = await getPublishedAgentOr(params.agentId, codeAgent)
  const prompt = resolveCompletionPrompt(params)
  const traceId = resolveTraceId(params)

  return withMastraSpan(
    traceId,
    `${COMPLETION_SPAN_PREFIX}${params.agentId}`,
    async span => {
      const response = await meteredCall(LlmFeature.LoopCreator, () =>
        agent.generate(prompt, {
          ...generateExtras(params, span.spanId),
          structuredOutput: {
            schema: params.schema,
            errorStrategy: LoopCreatorStructuredOutputErrorStrategy.Warn,
          },
        })
      )
      const parsed = params.schema.safeParse(response.object)
      return parsed.success ? parsed.data : null
    },
    { agentId: params.agentId, temperature: params.temperature }
  )
}

async function runLoopCreatorDirectStructuredCompletion<T>(
  params: LoopCreatorStructuredCompletionParams<T>
): Promise<T | null> {
  const traceId = resolveTraceId(params)
  try {
    return await withMastraSpan(
      traceId,
      `${COMPLETION_SPAN_PREFIX}${params.agentId}`,
      async () =>
        completeStructured({
          scope: params.scope,
          feature: LlmFeature.LoopCreator,
          model: resolveLoopCreatorModel(params.modelOverride),
          system: params.systemPrompt,
          prompt: resolveCompletionPrompt(params),
          temperature: params.temperature,
          schema: params.schema,
          traceId,
        }),
      { agentId: params.agentId, temperature: params.temperature }
    )
  } catch {
    return null
  }
}

export async function runLoopCreatorStructuredCompletion<T>(
  params: LoopCreatorStructuredCompletionParams<T>
): Promise<T | null> {
  try {
    return await runLoopCreatorMastraStructuredCompletion(params)
  } catch {
    return runLoopCreatorDirectStructuredCompletion(params)
  }
}
