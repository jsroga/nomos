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
import { OPENROUTER_AUTO_MODEL, toOpenRouterModel } from '@/shared/agent-kernel/models'

const LOOP_CREATOR_MODEL_ENV = 'LOOP_CREATOR_MODEL'

/**
 * Model id for the LangChain `ChatOpenAI` path (talks to OpenRouter directly):
 * `override` → env → `openrouter/auto-beta`. Not gateway-prefixed — the client
 * is already pointed at OpenRouter's endpoint.
 */
export function resolveLoopCreatorModel(override?: string): string {
  return override || process.env[LOOP_CREATOR_MODEL_ENV] || OPENROUTER_AUTO_MODEL
}

/**
 * Model string for the Mastra agents (`LOOP_CREATOR_MASTRA=1` specialists +
 * market-analyst), routed through the OpenRouter gateway.
 */
export function resolveLoopCreatorMastraModel(override?: string): string {
  return toOpenRouterModel(override || process.env[LOOP_CREATOR_MODEL_ENV])
}
