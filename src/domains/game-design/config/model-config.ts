/**
 * Game-design model resolution — single source of truth (was duplicated inline
 * in the route and the agent). Env override → default, normalized to the Mastra
 * `provider/model` form. A step toward the storyteller role-matrix convention;
 * game-design has one role today, so this stays a one-liner.
 */

import '@/shared/data/server-guard'
import { toOpenRouterModel } from '@/shared/agent-kernel/models'

const GAME_DESIGN_MODEL_ENV = 'GAME_DESIGN_MODEL'

/**
 * Resolve the game-design model, routed through the OpenRouter gateway (single
 * OPENROUTER_API_KEY): `override` → `GAME_DESIGN_MODEL` env → `openrouter/auto-beta`.
 */
export function resolveGameDesignModel(override?: string): string {
  return toOpenRouterModel(override || process.env[GAME_DESIGN_MODEL_ENV])
}
