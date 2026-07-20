/**
 * Flagged Mastra completion path for the loop-creator specialists.
 *
 * `LOOP_CREATOR_MASTRA=1` routes each specialist's single LLM call through the
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
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages'
import { v4 as uuidv4 } from 'uuid'
import { withMastraSpan } from '@/shared/observability/mastra-tracing'
import { resolveLoopCreatorModel } from '../../../config/model-config'
import {
  LoopCreatorMastraAgentId,
  loopCreatorMastraAgentById,
} from './loop-creator-mastra-agents'

const LOOP_CREATOR_MASTRA_ENV = 'LOOP_CREATOR_MASTRA'
const LOOP_CREATOR_MASTRA_ON = '1'
const COMPLETION_SPAN_PREFIX = 'loop-creator.completion.'
const FALLBACK_USER_PROMPT = 'Proceed.'
const HISTORY_HEADER = 'Recent conversation:'
const ROLE_ASSISTANT = 'assistant'
const ROLE_SYSTEM = 'system'
const ROLE_USER = 'user'
const JSON_OBJECT_FORMAT = 'json_object'
const JSON_ONLY_DIRECTIVE = 'Respond ONLY with a single valid JSON object, no prose.'

/** Whether the flagged Mastra path is active. */
export function isLoopCreatorMastraEnabled(): boolean {
  return process.env[LOOP_CREATOR_MASTRA_ENV] === LOOP_CREATOR_MASTRA_ON
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
 * The default (flag-off) LangChain path — behaviorally identical to the inline
 * `new ChatOpenAI(...).invoke([SystemMessage(systemPrompt), ...history])` each
 * specialist used before; relocated here so both paths share one seam.
 */
async function runLoopCreatorLangChainCompletion(
  params: LoopCreatorCompletionParams
): Promise<string> {
  const model = new ChatOpenAI({
    modelName: resolveLoopCreatorModel(params.modelOverride),
    temperature: params.temperature,
    ...(params.jsonMode ? { modelKwargs: { response_format: { type: JSON_OBJECT_FORMAT } } } : {}),
  })

  const messages: BaseMessage[] = params.userPrompt
    ? [new SystemMessage(params.systemPrompt), new HumanMessage(params.userPrompt)]
    : [new SystemMessage(params.systemPrompt), ...(params.history ?? [])]

  const response = await model.invoke(messages)
  return typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
}

/**
 * Unified specialist completion seam: routes to the Mastra `Agent`
 * (`LOOP_CREATOR_MASTRA=1`) or the default LangChain path. Returns the raw text;
 * callers regex-parse JSON out of it in both cases.
 */
export async function runLoopCreatorCompletion(
  params: LoopCreatorCompletionParams
): Promise<string> {
  return isLoopCreatorMastraEnabled()
    ? runLoopCreatorMastraCompletion(params)
    : runLoopCreatorLangChainCompletion(params)
}
