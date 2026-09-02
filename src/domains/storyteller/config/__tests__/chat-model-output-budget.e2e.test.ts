/**
 * Live tier — why a Writers Room turn can stream back with no text.
 *
 *   npx vitest run src/domains/storyteller/config/__tests__/chat-model-output-budget.e2e.test.ts
 *
 * Needs OPENROUTER_API_KEY. Calls the model the `chat` role actually resolves
 * to and reports finishReason / usage at the old budget and the new one. A
 * reasoning model spends `maxOutputTokens` on hidden reasoning first, so a cap
 * sized for the answer alone finishes with `length` and zero visible text —
 * exactly what the route logged as `count=3`.
 */

import { resolveChatModelId } from '@/domains/storyteller/config/resolve-chat-model'
import { describe, expect, it } from 'vitest'
import { Agent } from '@mastra/core/agent'
import { AGENT_MODEL_MATRIX, resolveStorytellerModel } from '../constants/model-config'
import {
  USER_SELECTABLE_CHAT_MODELS,
} from '../constants/chat-model-catalog'

const ready = Boolean(process.env.OPENROUTER_API_KEY)
const PROMPT = 'In one short sentence, what makes a story premise compelling?'
const LEGACY_BUDGET = 2000
const AGENT_NAME = 'chat-budget-probe'

interface TurnResult {
  text: string
  finishReason: string
  totalTokens: number
  reasoningTokens: number
  elapsedMs: number
}

async function runTurn(modelId: string, maxOutputTokens: number): Promise<TurnResult> {
  const agent = new Agent({
    id: AGENT_NAME,
    name: AGENT_NAME,
    instructions: 'You are a concise story assistant.',
    model: resolveStorytellerModel(modelId),
  })
  const startedAt = Date.now()
  const result = await agent.generate(PROMPT, { modelSettings: { maxOutputTokens } })
  const usage = result.usage ?? {}
  return {
    text: (result.text ?? '').trim(),
    finishReason: String(result.finishReason ?? 'unknown'),
    totalTokens: Number(usage.totalTokens ?? 0),
    reasoningTokens: Number(usage.reasoningTokens ?? 0),
    elapsedMs: Date.now() - startedAt,
  }
}

/** Every id the Writers Room picker can send, plus the env/default fallback. */
const PROBE_MODEL_IDS = [
  ...new Set([resolveChatModelId(), ...USER_SELECTABLE_CHAT_MODELS.map(m => m.id)]),
]

describe.skipIf(!ready)('chat role output budget', () => {
  it.each(PROBE_MODEL_IDS)('%s answers within the configured budget', async modelId => {
    const legacy = await runTurn(modelId, LEGACY_BUDGET)
    console.log(`${modelId} @ ${LEGACY_BUDGET}:`, JSON.stringify(legacy))

    const current = await runTurn(modelId, AGENT_MODEL_MATRIX.chat.maxOutputTokens)
    console.log(
      `${modelId} @ ${AGENT_MODEL_MATRIX.chat.maxOutputTokens}:`,
      JSON.stringify(current)
    )

    // The configured budget must produce a visible answer — that is the whole
    // contract the Writers Room depends on.
    expect(current.text.length).toBeGreaterThan(0)
    expect(current.finishReason).not.toBe('length')
  })
})
