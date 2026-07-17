import '@/shared/data/server-guard'
import { Agent } from '@mastra/core/agent'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/model-config'
import { loadAgentInstructions } from '@/shared/agent-kernel/mastra/load-agent-instructions'

/**
 * The Muse (PLAN-V2 5.2) — stateless, BLANK-CONTEXT wildcard agent.
 *
 * Context starvation is the feature: no bible, no memory, no tools. The Muse
 * sees only its entropy hand and a one-line premise fragment, so its ideas
 * cannot regress to the mean of the existing story. Coherence is enforced
 * DOWNSTREAM (rank stage with bible context, planner engage-or-reject,
 * continuity critic) — never here.
 *
 * Randomness is code-side (core/muse/entropy.ts, D4), not sampling
 * temperature: the model must SATISFY dealt constraints, not "be creative".
 */

const MUSE_ID = 'muse'
const MUSE_NAME = 'Muse'
const MUSE_ROLE: Parameters<typeof resolveRoleModel>[0] = 'muse'
const MUSE_DESCRIPTION =
  'Blank-context wildcard ideas under dealt entropy constraints — surprising, concrete, story-moving. Ranked and filtered downstream.'

// Base prompt lives in src/mastra/agents/muse/instructions.md (editable, fully static).
export const museAgent = new Agent({
  id: MUSE_ID,
  name: MUSE_NAME,
  description: MUSE_DESCRIPTION,
  instructions: loadAgentInstructions(MUSE_ID),
  model: () => resolveRoleModel(MUSE_ROLE),
})
