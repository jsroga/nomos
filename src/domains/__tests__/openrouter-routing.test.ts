/**
 * OpenRouter routing UTs — pure, no network, always run in `npm run test:unit`.
 * Verify every model resolver funnels through the OpenRouter gateway on the
 * single OPENROUTER_API_KEY and defaults to TEXT_GEN_PRIMARY_MODEL (Kimi).
 * Anthropic text ids remap to Kimi (enforceTextGenModelPolicy).
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
  TEXT_GEN_PRIMARY_MODEL,
  TEXT_GEN_SHORT_IMPACT_MODEL,
  openRouterClientConfig,
} from '@/shared/agent-kernel/models'
import { resolveGameDesignModel } from '@/domains/game-design/config/model-config'
import {
  resolveLoopCreatorMastraModel,
  resolveLoopCreatorModel,
} from '@/domains/loop-creator/config/model-config'
import { toMastraJudgingModel } from '@/shared/agent-kernel/scorers/shared'
import {
  getModelByEffort,
  resolveRoleModel,
  resolveStorytellerModel,
} from '@/domains/storyteller/config/constants/model-config'
import {
  DEFAULT_CHAT_MODEL,
  USER_SELECTABLE_CHAT_MODELS,
} from '@/domains/storyteller/config/constants/chat-model-catalog'
import { withGatewayContext } from '@/shared/ai/gateway/call-context'
import { SystemScopeReason, systemScope } from '@/shared/auth/project-scope'
import {
  __resetModelSettingsCache,
  __setModelSettingForTest,
} from '@/shared/agent-kernel/model-settings'

const SCOPE = systemScope('11111111-1111-4111-8111-111111111111', SystemScopeReason.JobContext)

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
  it('defaults empty/undefined to the primary text model id', () => {
    expect(OPENROUTER_AUTO_MODEL).toBe(TEXT_GEN_PRIMARY_MODEL)
    expect(toOpenRouterModelId()).toBe(TEXT_GEN_PRIMARY_MODEL)
    expect(toOpenRouterModelId('')).toBe(TEXT_GEN_PRIMARY_MODEL)
  })
  it('normalizes provider:model to provider/model (no gateway prefix)', () => {
    expect(toOpenRouterModelId('openai:gpt-5.6-sol')).toBe('openai/gpt-5.6-sol')
    expect(toOpenRouterModelId('openai/gpt-5.6-sol')).toBe('openai/gpt-5.6-sol')
  })
  it('remaps Anthropic text ids to the primary model', () => {
    expect(toOpenRouterModelId('anthropic/claude-sonnet-5')).toBe(TEXT_GEN_PRIMARY_MODEL)
  })
})

describe('toOpenRouterModel (Mastra gateway string)', () => {
  it('defaults to openrouter/<primary>', () => {
    expect(OPENROUTER_AUTO_GATEWAY).toBe(`openrouter/${TEXT_GEN_PRIMARY_MODEL}`)
    expect(toOpenRouterModel()).toBe(OPENROUTER_AUTO_GATEWAY)
    expect(toOpenRouterModel('')).toBe(OPENROUTER_AUTO_GATEWAY)
    expect(toOpenRouterModel(OPENROUTER_AUTO_MODEL)).toBe(OPENROUTER_AUTO_GATEWAY)
  })

  it('gateways provider:model and provider/model ids', () => {
    expect(toOpenRouterModel('openai:gpt-5.6-sol')).toBe('openrouter/openai/gpt-5.6-sol')
    expect(toOpenRouterModel('z-ai/glm-5.2')).toBe('openrouter/z-ai/glm-5.2')
    expect(toOpenRouterModel('openai/gpt-5.6-sol')).toBe('openrouter/openai/gpt-5.6-sol')
  })

  it('leaves an already-gatewayed 3-segment id untouched when non-Anthropic', () => {
    expect(toOpenRouterModel('openrouter/z-ai/glm-5.2')).toBe('openrouter/z-ai/glm-5.2')
    expect(toOpenRouterModel('openrouter/openai/gpt-5.6-sol')).toBe(
      'openrouter/openai/gpt-5.6-sol',
    )
  })
})

describe('every model resolver routes through OpenRouter', () => {
  it('Mastra resolvers default to the auto gateway string', () => {
    expect(resolveGameDesignModel()).toBe(OPENROUTER_AUTO_GATEWAY)
    expect(resolveLoopCreatorMastraModel()).toBe(OPENROUTER_AUTO_GATEWAY)
    expect(toMastraJudgingModel()).toBe(`openrouter/${TEXT_GEN_SHORT_IMPACT_MODEL}`)
    expect(resolveRoleModel('chat')).toBe(OPENROUTER_AUTO_GATEWAY)
    expect(resolveRoleModel('author')).toBe(OPENROUTER_AUTO_GATEWAY)
  })

  it('the LangChain direct-client resolver returns the OpenRouter model id', () => {
    expect(resolveLoopCreatorModel()).toBe(OPENROUTER_AUTO_MODEL)
  })

  it('env overrides are routed through the gateway (single key)', () => {
    process.env.GAME_DESIGN_MODEL = 'z-ai:glm-5.2'
    expect(resolveGameDesignModel()).toBe('openrouter/z-ai/glm-5.2')
    process.env.JUDGING_MODEL = 'openai/gpt-5.6-sol'
    expect(toMastraJudgingModel()).toBe('openrouter/openai/gpt-5.6-sol')
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

  it('generation effort tiers do not use GPT-5.6 Sol', () => {
    expect(getModelByEffort('low')).not.toContain('gpt-5.6-sol')
    expect(getModelByEffort('medium')).not.toContain('gpt-5.6-sol')
    expect(getModelByEffort('high')).not.toContain('gpt-5.6-sol')
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
    __setModelSettingForTest('game-design', 'z-ai/glm-5.2')
    expect(resolveGameDesignModel()).toBe('openrouter/z-ai/glm-5.2')
    // other slots stay on the default
    expect(resolveRoleModel('chat')).toBe(OPENROUTER_AUTO_GATEWAY)
  })

  it('the default slot applies to any unset role', () => {
    __setModelSettingForTest('default', 'z-ai/glm-5.2')
    expect(resolveRoleModel('chat')).toBe('openrouter/z-ai/glm-5.2')
    expect(resolveGameDesignModel()).toBe('openrouter/z-ai/glm-5.2')
    expect(toMastraJudgingModel()).toBe('openrouter/z-ai/glm-5.2')
    expect(resolveLoopCreatorMastraModel()).toBe('openrouter/z-ai/glm-5.2')
  })

  it('a specific slot overrides the default slot', () => {
    __setModelSettingForTest('default', 'z-ai/glm-5.2')
    __setModelSettingForTest('author', 'moonshotai/kimi-k2.7-code')
    expect(resolveRoleModel('author')).toBe('openrouter/moonshotai/kimi-k2.7-code')
    expect(resolveRoleModel('chat')).toBe('openrouter/z-ai/glm-5.2')
  })
})

/**
 * Three models, three jobs. The writer picks between Kimi and Sol for the
 * writing roles; the cheap tier is hardcoded and a picker choice must not
 * retarget it.
 */
describe('role lanes', () => {
  const KIMI = `openrouter/${TEXT_GEN_PRIMARY_MODEL}`
  const SOL = `openrouter/${TEXT_GEN_SHORT_IMPACT_MODEL}`
  const GLM = 'openrouter/z-ai/glm-5.2'

  it('writing and structure default to Kimi', () => {
    expect(resolveRoleModel('chat')).toBe(KIMI)
    expect(resolveRoleModel('author')).toBe(KIMI)
    expect(resolveRoleModel('planner')).toBe(KIMI)
    expect(resolveRoleModel('premise')).toBe(KIMI)
  })

  it('the cheap tier defaults to GLM, not the primary model', () => {
    expect(resolveRoleModel('critic')).toBe(GLM)
    expect(resolveRoleModel('muse')).toBe(GLM)
  })

  it('the picker offers exactly Kimi and Sol', () => {
    expect(USER_SELECTABLE_CHAT_MODELS.map(option => option.id)).toEqual([
      DEFAULT_CHAT_MODEL,
      'openai:gpt-5.6-sol',
    ])
  })

  it('a picker choice retargets the writing roles but not the cheap tier', async () => {
    await withGatewayContext({ scope: SCOPE, writerModel: 'openai:gpt-5.6-sol' }, async () => {
      expect(resolveRoleModel('chat')).toBe(SOL)
      expect(resolveRoleModel('author')).toBe(SOL)
      expect(resolveRoleModel('planner')).toBe(SOL)
      expect(resolveRoleModel('premise')).toBe(SOL)
      expect(resolveRoleModel('critic')).toBe(GLM)
      expect(resolveRoleModel('muse')).toBe(GLM)
    })
  })

  it('a picker choice wins over an admin slot and an env pin, as the chat picker does', async () => {
    __setModelSettingForTest('author', 'z-ai/glm-5.2')
    process.env.STORYTELLER_AUTHOR_MODEL = 'moonshotai/kimi-k2.7-code'
    await withGatewayContext({ scope: SCOPE, writerModel: 'openai:gpt-5.6-sol' }, async () => {
      expect(resolveRoleModel('author')).toBe(SOL)
    })
    // Outside a request, the operator layers apply again.
    expect(resolveRoleModel('author')).toBe(GLM)
  })

  it('ignores a writerModel that is not in the catalog', async () => {
    await withGatewayContext({ scope: SCOPE, writerModel: 'anthropic/claude-opus-5' }, async () => {
      expect(resolveRoleModel('author')).toBe(KIMI)
    })
  })

  it('effort tiers span the cheap and primary lanes only', () => {
    expect(getModelByEffort('low')).toContain('glm')
    expect(getModelByEffort('medium')).toContain('kimi')
    expect(getModelByEffort('high')).toContain('kimi')
  })
})
