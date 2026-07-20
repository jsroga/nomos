/**
 * Game-design model resolution — single source of truth (was duplicated inline
 * in the route and the agent). Env override → default, normalized to the Mastra
 * `provider/model` form. A step toward the storyteller role-matrix convention;
 * game-design has one role today, so this stays a one-liner.
 */

import '@/shared/data/server-guard'
import {
  GameDesignDefaultModel,
  GameDesignModelSeparator,
} from '@/domains/game-design/ai/constants/agent-identity'

const GAME_DESIGN_MODEL_ENV = 'GAME_DESIGN_MODEL'

/**
 * Resolve the game-design model id: `override` → `GAME_DESIGN_MODEL` env →
 * default, normalized `provider:model` → `provider/model`. Idempotent.
 */
export function resolveGameDesignModel(override?: string): string {
  const raw = override || process.env[GAME_DESIGN_MODEL_ENV] || GameDesignDefaultModel.OpenAiGpt4o
  return raw.replace(GameDesignModelSeparator.Colon, GameDesignModelSeparator.Slash)
}
