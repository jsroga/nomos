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

const LOOP_CREATOR_MODEL_ENV = 'LOOP_CREATOR_MODEL'

/**
 * OpenRouter model id for the LangChain `ChatOpenAI` path (client already points
 * at OpenRouter's endpoint): `override` → env → `openrouter/auto-beta`. NOT the
 * Mastra gateway string.
 */
export function resolveLoopCreatorModel(override?: string): string {
  return toOpenRouterModelId(override || process.env[LOOP_CREATOR_MODEL_ENV])
}

/**
 * Model string for the Mastra agents (`LOOP_CREATOR_MASTRA=1` specialists +
 * market-analyst), routed through the OpenRouter gateway.
 */
export function resolveLoopCreatorMastraModel(override?: string): string {
  return toOpenRouterModel(override || process.env[LOOP_CREATOR_MODEL_ENV])
}
