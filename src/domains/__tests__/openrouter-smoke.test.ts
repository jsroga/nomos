/**
 * OpenRouter live smoke — real calls through the gateway; proves the single
 * OPENROUTER_API_KEY actually drives every layer.
 *
 * Not part of `npm run test:unit`. Run with:
 *
 *   npm run test:smoke:openrouter
 */

import { describe, it, expect } from 'vitest'
import { Agent } from '@mastra/core/agent'
import {
  OPENROUTER_AUTO_MODEL,
  OPENROUTER_AUTO_GATEWAY,
  openRouterClientConfig,
} from '@/shared/agent-kernel/models'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/model-config'
import { resolveGameDesignModel } from '@/domains/game-design/config/model-config'
import { registerCorePrompts } from '@/shared/agent-kernel/prompts/registry'

const TIMEOUT_MS = 45_000
const MAGIC_TIMEOUT_MS = 60_000
const OPENROUTER_SMOKE_MISSING_KEY =
  'OPENROUTER_API_KEY is required for npm run test:smoke:openrouter'

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error(OPENROUTER_SMOKE_MISSING_KEY)
}

describe('OpenRouter live smoke', () => {
  it(
    'a Mastra Agent on the auto gateway string returns text',
    async () => {
      // Mastra gateway needs the double-prefixed form; a bare openrouter/auto-beta
      // yields "Invalid URL" (see OPENROUTER_AUTO_GATEWAY doc).
      const agent = new Agent({
        id: 'openrouter-smoke-auto',
        name: 'OpenRouter Smoke (auto)',
        instructions: 'You reply with a single short word.',
        model: OPENROUTER_AUTO_GATEWAY,
      })
      const response = await agent.generate('Reply with the word: pong')
      expect(response.text.trim().length).toBeGreaterThan(0)
      expect(OPENROUTER_AUTO_MODEL).toBe('openrouter/auto-beta')
    },
    TIMEOUT_MS
  )

  it(
    'a resolver-produced model string is accepted by the gateway',
    async () => {
      // Exercises the real resolver output (default openrouter/auto-beta, or a
      // gatewayed env override) end-to-end.
      const chatModel = resolveRoleModel('chat')
      const gameModel = resolveGameDesignModel()
      const agent = new Agent({
        id: 'openrouter-smoke-resolver',
        name: 'OpenRouter Smoke (resolver)',
        instructions: 'You answer in one short sentence.',
        model: chatModel,
      })
      const response = await agent.generate('Name one primary color.')
      expect(response.text.trim().length).toBeGreaterThan(0)
      expect(gameModel.startsWith('openrouter/')).toBe(true)
    },
    TIMEOUT_MS
  )

  it(
    'the AI SDK via openRouterClientConfig returns text',
    async () => {
      const { createOpenAI } = await import('@ai-sdk/openai')
      const { generateText } = await import('ai')
      const openRouter = openRouterClientConfig()
      const openrouter = createOpenAI({
        apiKey: openRouter.apiKey,
        baseURL: openRouter.baseURL,
      })
      const { text } = await generateText({
        model: openrouter(OPENROUTER_AUTO_MODEL),
        prompt: 'Reply with one word.',
      })
      expect(text.trim().length).toBeGreaterThan(0)
    },
    TIMEOUT_MS
  )

  it(
    'magicScorer scores creative output via LLM',
    async () => {
      registerCorePrompts()
      const { magicScorer } = await import('@/shared/agent-kernel/scorers/magic-scorer')
      const result = await magicScorer.run({
        input: { message: 'Write a scene' },
        output:
          'Rain hammered the corrugated roof. Mara counted the seconds between thunder and counted them wrong on purpose.',
      })
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(1)
      expect(result.reason).toBeTruthy()
    },
    MAGIC_TIMEOUT_MS
  )
})
