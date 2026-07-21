/**
 * OpenRouter live smoke — real calls through the gateway; proves the single
 * OPENROUTER_API_KEY actually drives every layer.
 *
 * Opt-in: activates only when RUN_OPENROUTER_SMOKE=1 AND OPENROUTER_API_KEY are
 * set, so the normal `npm run test:unit` never hits the network. Run it with:
 *
 *   npm run test:smoke:openrouter          # sets RUN_OPENROUTER_SMOKE=1
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

const optedIn = Boolean(process.env.RUN_OPENROUTER_SMOKE)
const hasKey = Boolean(process.env.OPENROUTER_API_KEY)
const active = optedIn && hasKey
const smoke = active ? describe : describe.skip
const TIMEOUT_MS = 45_000

if (optedIn && !hasKey) {
  // Opted in but no key — surface WHY it skipped rather than silently passing.
  console.warn('[openrouter-smoke] skipped — RUN_OPENROUTER_SMOKE set but OPENROUTER_API_KEY missing.')
}

smoke('OpenRouter live smoke (needs OPENROUTER_API_KEY)', () => {
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
    'LangChain ChatOpenAI via openRouterClientConfig returns text',
    async () => {
      const { ChatOpenAI } = await import('@langchain/openai')
      const openRouter = openRouterClientConfig()
      const model = new ChatOpenAI({
        model: OPENROUTER_AUTO_MODEL,
        apiKey: openRouter.apiKey,
        configuration: { baseURL: openRouter.baseURL },
      })
      const response = await model.invoke('Reply with one word.')
      const text =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
      expect(text.trim().length).toBeGreaterThan(0)
    },
    TIMEOUT_MS
  )
})
