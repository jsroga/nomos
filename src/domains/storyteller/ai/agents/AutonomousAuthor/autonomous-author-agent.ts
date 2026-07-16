/**
 * Autonomous author agent — the long-running "keep drafting until the episode
 * premise is satisfied" loop (Mastra goals + durable agents).
 *
 * A standing thread-scoped OBJECTIVE (set via `setObjective`) is judged after
 * each loop iteration by a critic-role model; the loop keeps drafting beats
 * (via the beat-draft workflow tool) until the judge marks the objective done
 * or the run budget is exhausted. Wrapped for durable execution in the
 * `core/io/mastra-runtime` seam so a client can disconnect and reconnect.
 *
 * Flagged (`STORYTELLER_AUTONOMOUS=1`); the legacy per-beat flow is unaffected.
 */

import '@/shared/data/server-guard'
import { Agent } from '@mastra/core/agent'
import type { GoalConfig } from '@mastra/core/agent'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/model-config'
import { buildChatAdapterPrompt } from '@/domains/storyteller/ai/prompts/chat-adapter-prompt'
import { getEntityLinkRequirements } from '@/domains/storyteller/config/storyteller-config'
import { listBeatsTool } from '@/domains/storyteller/ai/tools/beat-tools'
import { readWorldBibleTool, checkContinuityTool } from '@/domains/storyteller/ai/tools/bible-tools'
import { listCharactersTool } from '@/domains/storyteller/ai/tools/character-tools'
import { runBeatDraftWorkflowTool } from '@/domains/storyteller/ai/tools/workflow-tool'

export const AUTONOMOUS_AUTHOR_ID = 'storyteller-autonomous-author'
export const AUTONOMOUS_AUTHOR_NAME = 'Storyteller Autonomous Author'
const AUTONOMOUS_AUTHOR_DESCRIPTION =
  'Long-running author: drafts an episode beat-by-beat toward a standing objective, judged by the critics after each iteration.'

/** Default goal budget — evaluations before the loop stops (resumable by raising it). */
export const STORYTELLER_AUTONOMOUS_MAX_RUNS = 20

// Role slots resolved from the model matrix (typed consts keep them off the magic-string rule).
const AUTHOR_ROLE: Parameters<typeof resolveRoleModel>[0] = 'author'
const CRITIC_ROLE: Parameters<typeof resolveRoleModel>[0] = 'critic'

/**
 * Guidance layered on the default goal judge. Keeps "done" honest: the episode
 * only counts as satisfied when its beats actually dramatize the premise with
 * irreversible motion and no dangling setups.
 */
const AUTONOMOUS_GOAL_PROMPT = `Judge the objective ONLY against the drafted beats, not the assistant's promises.
Mark it complete when, and only when:
- the episode has a full sequence of beats that dramatize the stated premise,
- each beat forces an irreversible state change (no mood-only beats, no stasis endings),
- every setup has a payoff and continuity holds.
Otherwise keep the loop going with concrete feedback on the single weakest beat.`

const autonomousGoal: GoalConfig = {
  // Critic-role model as the judge (resolver form: reads provider creds + selection at runtime).
  judge: () => resolveRoleModel(CRITIC_ROLE),
  maxRuns: STORYTELLER_AUTONOMOUS_MAX_RUNS,
  prompt: AUTONOMOUS_GOAL_PROMPT,
}

/**
 * The backing author agent. Drafts on the author-role model (Kimi by default);
 * read-only context tools + the beat-draft workflow are the only tools it needs
 * to keep drafting toward the objective.
 */
export const autonomousAuthorAgent = new Agent({
  id: AUTONOMOUS_AUTHOR_ID,
  name: AUTONOMOUS_AUTHOR_NAME,
  description: AUTONOMOUS_AUTHOR_DESCRIPTION,
  instructions: () => buildChatAdapterPrompt(getEntityLinkRequirements()),
  model: () => resolveRoleModel(AUTHOR_ROLE),
  tools: {
    [runBeatDraftWorkflowTool.id]: runBeatDraftWorkflowTool,
    [listBeatsTool.id]: listBeatsTool,
    [readWorldBibleTool.id]: readWorldBibleTool,
    [checkContinuityTool.id]: checkContinuityTool,
    [listCharactersTool.id]: listCharactersTool,
  },
  goal: autonomousGoal,
})

/** Exposed for tests: the goal config the agent runs with. */
export function getAutonomousGoalConfig(): GoalConfig {
  return autonomousGoal
}

/** Env flag (`STORYTELLER_AUTONOMOUS=1`) that enables the durable autonomous loop. */
const AUTONOMOUS_FLAG_ENABLED = '1'
export const STORYTELLER_AUTONOMOUS_ENV = 'STORYTELLER_AUTONOMOUS'

export function isStorytellerAutonomousEnabled(): boolean {
  return process.env[STORYTELLER_AUTONOMOUS_ENV] === AUTONOMOUS_FLAG_ENABLED
}
