/**
 * Which model game-design uses. The precedence chain lives in the gateway's
 * model registry; this file holds only the domain's choice.
 */

import '@/shared/data/server-guard'
import {
  resolveGatewayModel,
  type ModelRoleSpec,
} from '@/shared/ai/gateway/model-registry'

const GAME_DESIGN_ROLE = 'game-design'
const GAME_DESIGN_MODEL_ENV = 'GAME_DESIGN_MODEL'

const GAME_DESIGN_SPEC: ModelRoleSpec = {
  role: GAME_DESIGN_ROLE,
  envVar: GAME_DESIGN_MODEL_ENV,
}

/**
 * Per-request override → admin panel setting → `GAME_DESIGN_MODEL` →
 * `openrouter/auto-beta`, routed through the OpenRouter gateway.
 */
export function resolveGameDesignModel(override?: string): string {
  return resolveGatewayModel(GAME_DESIGN_SPEC, override)
}
