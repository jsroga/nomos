/**
 * Which model loop-creator's specialists use. The precedence chain lives in
 * the gateway's model registry; this file holds only the domain's choice.
 */

import '@/shared/data/server-guard'
import {
  resolveGatewayModel,
  resolveOpenRouterModelId,
  type ModelRoleSpec,
} from '@/shared/ai/gateway/model-registry'

const LOOP_CREATOR_ROLE = 'loop-creator'
const LOOP_CREATOR_MODEL_ENV = 'LOOP_CREATOR_MODEL'

const LOOP_CREATOR_SPEC: ModelRoleSpec = {
  role: LOOP_CREATOR_ROLE,
  envVar: LOOP_CREATOR_MODEL_ENV,
}

/** A bare OpenRouter model id, for the direct-completion path. */
export function resolveLoopCreatorModel(override?: string): string {
  return resolveOpenRouterModelId(LOOP_CREATOR_SPEC, override)
}

/** The Mastra gateway string, for the flag-on specialist agents. */
export function resolveLoopCreatorMastraModel(override?: string): string {
  return resolveGatewayModel(LOOP_CREATOR_SPEC, override)
}
