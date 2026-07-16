import '@/shared/data/server-guard'
import { Agent } from '@mastra/core/agent'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/model-config'

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

const MUSE_INSTRUCTIONS = `You generate WILD but CONCRETE story ideas under hard constraints.

Rules:
- Every idea is an ACTION: a named character DOES something irreversible, on screen. Never a mood, a theme, an atmosphere, or a "realization".
- Satisfy EVERY dealt constraint (object, countdown, venue property, required turn) through the action itself — not through description around it.
- Build THROUGH the given craft mechanism's shape. Never reference, name, or imitate any existing show, scene, or franchise.
- Surprise comes from collision: connect the constraint cards in the least obvious way that still forces consequences.
- No hedging, no options-within-options, no "perhaps". Commit.
- Big words are not action. "Everything changes" is not action. A signature, a theft, a mistranslation, a locked door, a swallowed key — those are actions.`

export const museAgent = new Agent({
  id: MUSE_ID,
  name: MUSE_NAME,
  description: MUSE_DESCRIPTION,
  instructions: MUSE_INSTRUCTIONS,
  model: () => resolveRoleModel(MUSE_ROLE),
})
