import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { generateText, wrapLanguageModel } from 'ai'
import { SystemScopeReason, systemScope } from '@/shared/auth/project-scope'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import {
  OPENROUTER_JUDGING_OUTPUT_CEILING,
  OPENROUTER_OUTPUT_CEILING,
  OutputBudgetMiddlewareSpec,
} from '@/shared/ai/gateway/constants/output-budget'
import { withOpenRouterOutputBudget } from '@/shared/ai/gateway/output-budget'
import { LanguageModelMiddlewareSpec } from '@/shared/agent-kernel/scorers/constants/shared'
import { recordFromJson } from '@/shared/data/json-guards'

const { recordLlmCall } = vi.hoisted(() => ({ recordLlmCall: vi.fn(async () => undefined) }))

vi.mock('@/shared/config/env', () => ({
  env: {
    OPENROUTER_API_KEY: 'sk-or-test',
    EMBEDDING_MODEL: 'voyage-3',
    JUDGING_MODEL: 'openai/gpt-4o',
  },
}))

vi.mock('@/shared/ai/gateway/record', () => ({ recordLlmCall }))

vi.mock('@/shared/ai/embeddings/voyage-embeddings', () => ({
  getVoyageEmbeddings: () => ({
    modelId: () => 'voyage-3',
    embedDocumentsMetered: async (texts: string[]) => ({
      vectors: texts.map(() => [0.1]),
      promptTokens: 3,
      cacheHit: false,
    }),
  }),
}))

import { complete, completeStructured, embed } from '@/shared/ai/gateway'
import { createPureChatModel } from '@/shared/agent-kernel/models'
import { toMastraJudgingLanguageModel } from '@/shared/agent-kernel/scorers/shared'
import { clampOpenRouterOutputTokens } from '@/shared/ai/gateway/output-budget'

const SCOPE = systemScope('11111111-1111-4111-8111-111111111111', SystemScopeReason.ProviderSmoke)
const PRICED_MODEL = 'openai/gpt-4o'
const PROMPT = 'ping'

interface CapturedRequest {
  url: string
  body: Record<string, unknown>
}

const captured: CapturedRequest[] = []

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
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
  recordLlmCall.mockClear()
  process.env.OPENROUTER_API_KEY = 'sk-or-test'
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { url, body } = await requestUrlAndBody(input, init)
    captured.push({ url, body })
    if (url.includes('/responses')) return jsonResponse(responsesBody(JSON.stringify({ tag: 'ok' })))
    if (url.includes('/chat/completions')) {
      return jsonResponse(chatCompletionBody(JSON.stringify({ tag: 'ok' })))
    }
    return jsonResponse({})
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('gateway complete HTTP reservation', () => {
  it('posts Responses max_output_tokens for ContextualSummary', async () => {
    await complete({
      scope: SCOPE,
      feature: LlmFeature.StorytellerContextualSummary,
      model: PRICED_MODEL,
      prompt: PROMPT,
    })
    const call = lastModelCall()
    expect(call.url).toContain('/responses')
    expect(call.body.maxTokens).toBeUndefined()
    expect(call.body.max_output_tokens).toBe(2048)
  })

  it('posts Responses max_output_tokens for ArtifactDraft', async () => {
    await complete({
      scope: SCOPE,
      feature: LlmFeature.StorytellerArtifactDraft,
      model: PRICED_MODEL,
      prompt: PROMPT,
    })
    expect(lastModelCall().body.max_output_tokens).toBe(8000)
  })

  it('clamps an explicit 131072 override to the ceiling', async () => {
    await complete({
      scope: SCOPE,
      feature: LlmFeature.StorytellerArtifactDraft,
      model: PRICED_MODEL,
      prompt: PROMPT,
      maxOutputTokens: 131_072,
    })
    expect(lastModelCall().body.max_output_tokens).toBe(OPENROUTER_OUTPUT_CEILING)
  })

  it('posts the same Responses field for completeStructured', async () => {
    await completeStructured({
      scope: SCOPE,
      feature: LlmFeature.StorytellerArtifactDraft,
      model: PRICED_MODEL,
      prompt: PROMPT,
      schema: z.object({ tag: z.string() }),
    })
    const call = lastModelCall()
    expect(call.url).toContain('/responses')
    expect(call.body.max_output_tokens).toBe(8000)
  })

  it('records and rethrows a 402', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const { url, body } = await requestUrlAndBody(input, init)
      captured.push({ url, body })
      return jsonResponse({ error: { message: 'Insufficient credits' } }, 402)
    }))
    await expect(
      complete({
        scope: SCOPE,
        feature: LlmFeature.StorytellerChat,
        model: PRICED_MODEL,
        prompt: PROMPT,
      })
    ).rejects.toThrow()
    expect(recordLlmCall).toHaveBeenCalled()
  })
})

describe('embed HTTP path', () => {
  it('does not send a completion reservation', async () => {
    await embed({
      scope: SCOPE,
      feature: LlmFeature.RagEmbedding,
      texts: ['harbour bells'],
    })
    expect(captured.some(entry => entry.url.includes('/responses'))).toBe(false)
    expect(captured.some(entry => entry.url.includes('/chat/completions'))).toBe(false)
  })
})

describe('judge wrap HTTP reservation', () => {
  it('omitted judging maxOutputTokens becomes 1024 on Chat Completions', async () => {
    await generateText({
      model: toMastraJudgingLanguageModel(),
      prompt: PROMPT,
    })
    const call = lastModelCall()
    expect(call.url).toContain('/chat/completions')
    expect(declaredOutputTokens(call.body)).toBe(OPENROUTER_JUDGING_OUTPUT_CEILING)
  })

  it('keeps an explicit judging value below 1024', async () => {
    await generateText({
      model: toMastraJudgingLanguageModel(),
      prompt: PROMPT,
      maxOutputTokens: 256,
    })
    expect(declaredOutputTokens(lastModelCall().body)).toBe(256)
  })

  it('clamps an 8000 judging override to 1024', async () => {
    await generateText({
      model: toMastraJudgingLanguageModel(),
      prompt: PROMPT,
      maxOutputTokens: 8000,
    })
    expect(declaredOutputTokens(lastModelCall().body)).toBe(OPENROUTER_JUDGING_OUTPUT_CEILING)
  })

  it('keeps 1024 when an 8000 wrap sits outside the judging wrap', async () => {
    const model = withOpenRouterOutputBudget(toMastraJudgingLanguageModel())
    await generateText({ model, prompt: PROMPT })
    expect(declaredOutputTokens(lastModelCall().body)).toBe(OPENROUTER_JUDGING_OUTPUT_CEILING)
  })

  it('documents that the wrap closer to the model wins on overwrite', async () => {
    const innerOverwrite = wrapLanguageModel({
      model: createPureChatModel(PRICED_MODEL),
      middleware: {
        specificationVersion: OutputBudgetMiddlewareSpec.V3,
        transformParams: async ({ params }) => ({
          ...params,
          maxOutputTokens: 8000,
        }),
      },
    })
    const inverted = wrapLanguageModel({
      model: innerOverwrite,
      middleware: {
        specificationVersion: LanguageModelMiddlewareSpec.V3,
        transformParams: async ({ params }) => ({
          ...params,
          maxOutputTokens: clampOpenRouterOutputTokens(
            params.maxOutputTokens,
            OPENROUTER_JUDGING_OUTPUT_CEILING,
            OPENROUTER_JUDGING_OUTPUT_CEILING
          ),
        }),
      },
    })
    await generateText({ model: inverted, prompt: PROMPT })
    expect(declaredOutputTokens(lastModelCall().body)).toBe(8000)
  })

  it('does not record llm_calls from wrapLanguageModel itself', async () => {
    recordLlmCall.mockClear()
    await generateText({
      model: withOpenRouterOutputBudget(createPureChatModel(PRICED_MODEL)),
      prompt: PROMPT,
    })
    expect(recordLlmCall).not.toHaveBeenCalled()
    expect(OutputBudgetMiddlewareSpec.V3).toBe('v3')
  })
})
