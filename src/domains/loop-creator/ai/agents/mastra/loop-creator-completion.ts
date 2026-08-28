/**
 * Flagged Mastra completion path for the loop-creator specialists.
 *
 * `FF_LOOP_CREATOR_MASTRA=true` routes each specialist's single LLM call through the
 * registered Mastra `Agent` (`agent.generate`) instead of LangChain
 * `ChatOpenAI.invoke`, wrapped in a real `withMastraSpan`. The default (flag
 * off) path is left untouched in each specialist so the working feature cannot
 * regress until a live A/B flips this on.
 *
 * Faithful mapping of LangChain `[SystemMessage(systemPrompt), ...history]`:
 * `systemPrompt` → the per-call `instructions` execution override; the recent
 * history → the prompt messages (or `context` when a fixed `userPrompt` leads).
 */

import '@/shared/data/server-guard'
import type { BaseMessage } from '@/shared/chat/core/message'
import type { ProjectScope } from '@/shared/auth/project-scope'
import { complete } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { v4 as uuidv4 } from 'uuid'
import { withMastraSpan } from '@/shared/observability/mastra-tracing'
import { FeatureFlag, isFeatureEnabled } from '@/shared/data/constants/feature-flags'
import { resolveLoopCreatorModel } from '../../../config/model-config'
import {
  LoopCreatorMastraAgentId,
  loopCreatorMastraAgentById,
} from './loop-creator-mastra-agents'

const COMPLETION_SPAN_PREFIX = 'loop-creator.completion.'
const FALLBACK_USER_PROMPT = 'Proceed.'
const HISTORY_HEADER = 'Recent conversation:'
const ROLE_ASSISTANT = 'assistant'
const ROLE_SYSTEM = 'system'
const ROLE_USER = 'user'
const JSON_ONLY_DIRECTIVE = 'Respond ONLY with a single valid JSON object, no prose.'

/** Whether the flagged Mastra path is active. */
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

/**
 * Flatten recent history into a single user turn. Mastra and the `ai` package
 * ship structurally-incompatible `ModelMessage` types (v5 vs v3 provider
 * options), so a typed message array can't cross the `generate` boundary — the
 * system prompt is carried faithfully via the `instructions` override and the
 * turns are serialized here for continuity.
 */
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
  /** LangChain-path model override (`state.modelConfig?.model`). */
  modelOverride?: string
  /** Force JSON-object output (loop-planner). */
  jsonMode?: boolean
  traceId?: string
  /** The project this run bills to. */
  scope: ProjectScope
}

/**
 * Run one specialist completion on Mastra and return the raw text (the callers
 * regex-parse JSON out of it, exactly as with the LangChain path).
 */
export async function runLoopCreatorMastraCompletion(
  params: LoopCreatorCompletionParams
): Promise<string> {
  const agent = loopCreatorMastraAgentById[params.agentId]
  const historyText = flattenHistory(params.history ?? [])

  return withMastraSpan(
    params.traceId ?? uuidv4(),
    `${COMPLETION_SPAN_PREFIX}${params.agentId}`,
    async () => {
      const promptParts: string[] = []
      if (historyText) promptParts.push(historyText)
      if (params.userPrompt) promptParts.push(params.userPrompt)
      const prompt = promptParts.length > 0 ? promptParts.join('\n\n') : FALLBACK_USER_PROMPT

      const instructions = params.jsonMode
        ? `${params.systemPrompt}\n\n${JSON_ONLY_DIRECTIVE}`
        : params.systemPrompt

      const response = await agent.generate(prompt, {
        instructions,
        modelSettings: { temperature: params.temperature },
      })

      return response.text
    },
    { agentId: params.agentId, temperature: params.temperature }
  )
}

/**
 * The default (flag-off) path, now through the model gateway.
 *
 * It used to build a `ChatOpenAI` inline. The gateway takes a single prompt
 * rather than a message array, so history is flattened here — the previous
 * call passed the same content in the same order, and nothing downstream read
 * the message boundaries.
 */
async function runLoopCreatorDirectCompletion(
  params: LoopCreatorCompletionParams
): Promise<string> {
  const history = params.userPrompt
    ? params.userPrompt
    : (params.history ?? [])
        .map(message => `${message.role}: ${message.content}`)
        .join('\n\n')

  const { text } = await complete({
    scope: params.scope,
    feature: LlmFeature.LoopCreator,
    model: resolveLoopCreatorModel(params.modelOverride),
    system: params.systemPrompt,
    prompt: history,
    temperature: params.temperature,
    traceId: params.traceId,
  })
  return text
}

/**
 * Unified specialist completion seam: routes to the Mastra `Agent`
 * (`FF_LOOP_CREATOR_MASTRA=true`) or the default LangChain path. Returns the raw text;
 * callers regex-parse JSON out of it in both cases.
 */
export async function runLoopCreatorCompletion(
  params: LoopCreatorCompletionParams
): Promise<string> {
  return isLoopCreatorMastraEnabled()
    ? runLoopCreatorMastraCompletion(params)
    : runLoopCreatorDirectCompletion(params)
}
