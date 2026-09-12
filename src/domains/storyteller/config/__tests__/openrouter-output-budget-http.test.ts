import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Agent } from '@mastra/core/agent'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { OPENROUTER_OUTPUT_CEILING } from '@/shared/ai/gateway/constants/output-budget'
import { mastraCompletionSettings } from '@/shared/ai/gateway/output-budget'
import { EDITOR_DISABLED } from '@/shared/agent-kernel/mastra/editor-permissions'
import { recordFromJson } from '@/shared/data/json-guards'
import {
  getAgentModel,
  resolveRoleModel,
  StorytellerModelRoleKey,
} from '../model-config'

vi.mock('@/shared/config/env', () => ({
  env: {
    OPENROUTER_API_KEY: 'sk-or-test',
    EMBEDDING_MODEL: 'voyage-3',
    JUDGING_MODEL: 'openai/gpt-4o',
  },
}))

vi.mock('@/shared/ai/gateway/record', () => ({
  recordLlmCall: vi.fn(async () => undefined),
}))

const PRICED_MODEL = 'openai/gpt-4o'
const PROMPT = 'ping'

interface CapturedRequest {
  url: string
  body: Record<string, unknown>
}

const captured: CapturedRequest[] = []

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function chatCompletionBody(content = 'ok') {
  return {
    id: 'chatcmpl-test',
    object: 'chat.completion',
    created: 1,
    model: PRICED_MODEL,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 8, completion_tokens: 2, total_tokens: 10 },
  }
}

function responsesBody(text = 'ok') {
  return {
    id: 'resp-test',
    created_at: 1,
    model: PRICED_MODEL,
    output: [
      {
        type: 'message',
        role: 'assistant',
        id: 'msg-test',
        content: [{ type: 'output_text', text, annotations: [] }],
      },
    ],
    usage: { input_tokens: 8, output_tokens: 2 },
  }
}

function parseBody(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'string' || raw.length === 0) return {}
  try {
    return recordFromJson(JSON.parse(raw))
  } catch {
    return {}
  }
}

async function requestUrlAndBody(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ url: string; body: Record<string, unknown> }> {
  if (typeof input === 'string') {
    return { url: input, body: parseBody(init?.body) }
  }
  if (input instanceof URL) {
    return { url: input.href, body: parseBody(init?.body) }
  }
  const cloned = input.clone()
  return { url: cloned.url, body: parseBody(await cloned.text()) }
}

function declaredOutputTokens(body: Record<string, unknown>): number | undefined {
  if (typeof body.max_output_tokens === 'number') return body.max_output_tokens
  if (typeof body.max_tokens === 'number') return body.max_tokens
  if (typeof body.max_completion_tokens === 'number') return body.max_completion_tokens
  return undefined
}

function lastModelCall(): CapturedRequest {
  const call = [...captured].reverse().find(entry =>
    entry.url.includes('/responses') || entry.url.includes('/chat/completions')
  )
  if (!call) throw new Error('no OpenRouter completion request captured')
  return call
}

beforeEach(() => {
  captured.length = 0
  process.env.OPENROUTER_API_KEY = 'sk-or-test'
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { url, body } = await requestUrlAndBody(input, init)
    captured.push({ url, body })
    if (url.includes('/responses')) return jsonResponse(responsesBody())
    if (url.includes('/chat/completions')) return jsonResponse(chatCompletionBody())
    return jsonResponse({})
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Mastra string-router Chat Completions reservation', () => {
  it('sends max_tokens for resolveRoleModel author generate', async () => {
    const agent = new Agent({
      id: 'budget-author-probe',
      name: 'Budget Author Probe',
      instructions: 'Reply with ok',
      model: () => resolveRoleModel(StorytellerModelRoleKey.Author),
      editor: EDITOR_DISABLED,
    })
    await agent.generate(
      PROMPT,
      mastraCompletionSettings(LlmFeature.StorytellerBeatDraft, { roleBudget: 8000 })
    )
    const call = lastModelCall()
    expect(call.url).toContain('/chat/completions')
    const tokens = declaredOutputTokens(call.body)
    expect(tokens).toBeDefined()
    expect(tokens).toBeLessThanOrEqual(OPENROUTER_OUTPUT_CEILING)
    expect(tokens).toBe(8000)
  })

  it('keeps the cap when a loop-style model override is set', async () => {
    const agent = new Agent({
      id: 'budget-loop-probe',
      name: 'Budget Loop Probe',
      instructions: 'Reply with ok',
      model: 'openrouter/openai/gpt-4o',
      editor: EDITOR_DISABLED,
    })
    await agent.generate(PROMPT, {
      ...mastraCompletionSettings(LlmFeature.LoopCreator, { temperature: 0.4 }),
      model: 'openrouter/openai/gpt-4o',
    })
    const call = lastModelCall()
    expect(call.url).toContain('/chat/completions')
    expect(declaredOutputTokens(call.body)).toBe(8000)
  })

  it('posts Responses max_output_tokens from getAgentModel', async () => {
    const model = getAgentModel(PRICED_MODEL)
    if (typeof model === 'string') {
      throw new Error('getAgentModel must return a LanguageModel for openai/gpt-4o')
    }
    const agent = new Agent({
      id: 'budget-beat-cast-probe',
      name: 'Budget Beat Cast Probe',
      instructions: 'Reply with ok',
      model,
      editor: EDITOR_DISABLED,
    })
    await agent.generate(PROMPT, mastraCompletionSettings(LlmFeature.StorytellerBeatPlan))
    const call = lastModelCall()
    expect(call.url).toContain('/responses')
    const tokens = call.body.max_output_tokens
    expect(typeof tokens).toBe('number')
    expect(tokens).toBeLessThanOrEqual(OPENROUTER_OUTPUT_CEILING)
  })
})
