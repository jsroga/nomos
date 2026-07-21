/**
 * OpenRouter routing UTs — pure, no network, always run in `npm run test:unit`.
 * Verify every model resolver funnels through the OpenRouter gateway on the
 * single OPENROUTER_API_KEY and defaults to `openrouter/auto-beta`.
 *
 * Live verification (real OpenRouter call) is in `openrouter.e2e.test.ts`.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  toOpenRouterModel,
  toOpenRouterModelId,
  OPENROUTER_AUTO_MODEL,
  OPENROUTER_AUTO_GATEWAY,
  OPENROUTER_BASE_URL,
  openRouterClientConfig,
} from '@/shared/agent-kernel/models'
import { resolveGameDesignModel } from '@/domains/game-design/config/model-config'
import {
  resolveLoopCreatorMastraModel,
  resolveLoopCreatorModel,
} from '@/domains/loop-creator/config/model-config'
import { toMastraJudgingModel } from '@/shared/agent-kernel/scorers/shared'
import {
  resolveRoleModel,
  resolveStorytellerModel,
} from '@/domains/storyteller/config/constants/model-config'
import {
  __resetModelSettingsCache,
  __setModelSettingForTest,
} from '@/shared/agent-kernel/model-settings'

const MODEL_ENV_VARS = [
  'GAME_DESIGN_MODEL',
  'LOOP_CREATOR_MODEL',
  'JUDGING_MODEL',
  'GENERATION_MODEL',
  'NEXT_PUBLIC_DEFAULT_AGENT_MODEL',
  'STORYTELLER_AUTHOR_MODEL',
  'STORYTELLER_CHAT_MODEL',
  'STORYTELLER_PLANNER_MODEL',
  'STORYTELLER_CRITIC_MODEL',
  'STORYTELLER_MUSE_MODEL',
  'STORYTELLER_PREMISE_MODEL',
]

// Deterministic defaults regardless of the developer's shell env / DB settings.
beforeEach(() => {
  for (const name of MODEL_ENV_VARS) Reflect.deleteProperty(process.env, name)
  __resetModelSettingsCache()
})

describe('toOpenRouterModelId (direct OpenRouter clients)', () => {
  it('defaults empty/undefined to the auto router id', () => {
    expect(OPENROUTER_AUTO_MODEL).toBe('openrouter/auto-beta')
    expect(toOpenRouterModelId()).toBe('openrouter/auto-beta')
    expect(toOpenRouterModelId('')).toBe('openrouter/auto-beta')
  })
  it('normalizes provider:model to provider/model (no gateway prefix)', () => {
    expect(toOpenRouterModelId('openai:gpt-4o')).toBe('openai/gpt-4o')
    expect(toOpenRouterModelId('openai/gpt-5.6-luna')).toBe('openai/gpt-5.6-luna')
  })
})

describe('toOpenRouterModel (Mastra gateway string)', () => {
  it('defaults to the double-prefixed auto gateway string', () => {
    // Verified live: single `openrouter/auto-beta` → "Invalid URL"; the router
    // needs gateway=openrouter + model=openrouter/auto-beta.
    expect(OPENROUTER_AUTO_GATEWAY).toBe('openrouter/openrouter/auto-beta')
    expect(toOpenRouterModel()).toBe(OPENROUTER_AUTO_GATEWAY)
    expect(toOpenRouterModel('')).toBe(OPENROUTER_AUTO_GATEWAY)
    expect(toOpenRouterModel(OPENROUTER_AUTO_MODEL)).toBe(OPENROUTER_AUTO_GATEWAY)
  })

  it('gateways provider:model and provider/model ids', () => {
    expect(toOpenRouterModel('openai:gpt-4o')).toBe('openrouter/openai/gpt-4o')
    expect(toOpenRouterModel('anthropic/claude-sonnet-5')).toBe('openrouter/anthropic/claude-sonnet-5')
    expect(toOpenRouterModel('z-ai/glm-5.2')).toBe('openrouter/z-ai/glm-5.2')
    expect(toOpenRouterModel('openai/gpt-5.6-luna')).toBe('openrouter/openai/gpt-5.6-luna')
  })

  it('leaves an already-gatewayed 3-segment id untouched', () => {
    expect(toOpenRouterModel('openrouter/z-ai/glm-5.2')).toBe('openrouter/z-ai/glm-5.2')
    expect(toOpenRouterModel('openrouter/openai/gpt-4o')).toBe('openrouter/openai/gpt-4o')
  })
})

describe('every model resolver routes through OpenRouter', () => {
  it('Mastra resolvers default to the auto gateway string', () => {
    expect(resolveGameDesignModel()).toBe(OPENROUTER_AUTO_GATEWAY)
    expect(resolveLoopCreatorMastraModel()).toBe(OPENROUTER_AUTO_GATEWAY)
    expect(toMastraJudgingModel()).toBe(OPENROUTER_AUTO_GATEWAY)
    expect(resolveRoleModel('chat')).toBe(OPENROUTER_AUTO_GATEWAY)
    expect(resolveRoleModel('author')).toBe(OPENROUTER_AUTO_GATEWAY)
  })

  it('the LangChain direct-client resolver returns the OpenRouter model id', () => {
    expect(resolveLoopCreatorModel()).toBe(OPENROUTER_AUTO_MODEL)
  })

  it('env overrides are routed through the gateway (single key)', () => {
    process.env.GAME_DESIGN_MODEL = 'openai:gpt-4o'
    expect(resolveGameDesignModel()).toBe('openrouter/openai/gpt-4o')
    process.env.JUDGING_MODEL = 'anthropic/claude-sonnet-4.5'
    expect(toMastraJudgingModel()).toBe('openrouter/anthropic/claude-sonnet-4.5')
    process.env.STORYTELLER_AUTHOR_MODEL = 'moonshotai/kimi-k2'
    expect(resolveRoleModel('author')).toBe('openrouter/moonshotai/kimi-k2')
  })

  it('GLM + Kimi catalog entries resolve to their OpenRouter ids', () => {
    // GLM's internal id differs from its OpenRouter id (openRouterId mapping).
    expect(resolveStorytellerModel('zai-coding-plan:glm-5.2')).toBe('openrouter/z-ai/glm-5.2')
    expect(resolveStorytellerModel('moonshotai:kimi-k2.7-code')).toBe(
      'openrouter/moonshotai/kimi-k2.7-code'
    )
  })
})

describe('openRouterClientConfig', () => {
  it('points LangChain/AI-SDK clients at the OpenRouter endpoint', () => {
    expect(openRouterClientConfig().baseURL).toBe(OPENROUTER_BASE_URL)
    expect(OPENROUTER_BASE_URL).toContain('openrouter.ai')
  })
})

describe('admin model settings override the resolvers', () => {
  it('a per-slot setting wins over the auto default', () => {
    __setModelSettingForTest('game-design', 'openai/gpt-5.6-luna')
    expect(resolveGameDesignModel()).toBe('openrouter/openai/gpt-5.6-luna')
    // other slots stay on the default
    expect(resolveRoleModel('chat')).toBe(OPENROUTER_AUTO_GATEWAY)
  })

  it('the default slot applies to any unset role', () => {
    __setModelSettingForTest('default', 'openai/gpt-5.6-luna')
    expect(resolveRoleModel('chat')).toBe('openrouter/openai/gpt-5.6-luna')
    expect(resolveGameDesignModel()).toBe('openrouter/openai/gpt-5.6-luna')
    expect(toMastraJudgingModel()).toBe('openrouter/openai/gpt-5.6-luna')
    expect(resolveLoopCreatorMastraModel()).toBe('openrouter/openai/gpt-5.6-luna')
  })

  it('a specific slot overrides the default slot', () => {
    __setModelSettingForTest('default', 'openai/gpt-4o-mini')
    __setModelSettingForTest('author', 'anthropic/claude-opus-4.8')
    expect(resolveRoleModel('author')).toBe('openrouter/anthropic/claude-opus-4.8')
    expect(resolveRoleModel('chat')).toBe('openrouter/openai/gpt-4o-mini')
  })
})
