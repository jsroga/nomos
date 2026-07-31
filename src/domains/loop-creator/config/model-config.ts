/**
 * Loop-creator model resolution — single source of truth for the specialist
 * agents (supervisor, balance-analyst, concept-evaluator, loop-planner,
 * progression-architect, mechanics-designer) + the market-analyst.
 *
 * Everything routes through the OpenRouter gateway (single OPENROUTER_API_KEY):
 * `override` (per-request `state.modelConfig.model`) → `LOOP_CREATOR_MODEL` env
 * → `openrouter/auto-beta`. The LangChain (`ChatOpenAI`) fallback path talks to
 * OpenRouter's OpenAI-compatible endpoint (see `openRouterClientConfig`).
 */

import '@/shared/data/server-guard'
import { toOpenRouterModel, toOpenRouterModelId } from '@/shared/agent-kernel/models'
import { getConfiguredModel } from '@/shared/agent-kernel/model-settings'

const LOOP_CREATOR_MODEL_ENV = 'LOOP_CREATOR_MODEL'
const LOOP_CREATOR_ROLE = 'loop-creator'

function loopCreatorModelId(override?: string): string | undefined {
  return override || getConfiguredModel(LOOP_CREATOR_ROLE) || process.env[LOOP_CREATOR_MODEL_ENV]
}

/**
 * OpenRouter model id for the LangChain `ChatOpenAI` path (client already points
 * at OpenRouter's endpoint): `override` → admin panel → env → `openrouter/auto-beta`.
 * NOT the Mastra gateway string.
 */
export function resolveLoopCreatorModel(override?: string): string {
  return toOpenRouterModelId(loopCreatorModelId(override))
}

/**
 * Model string for the Mastra agents (`FF_LOOP_CREATOR_MASTRA=true` specialists +
 * market-analyst), routed through the OpenRouter gateway.
 */
export function resolveLoopCreatorMastraModel(override?: string): string {
  return toOpenRouterModel(loopCreatorModelId(override))
}
