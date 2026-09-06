/**
 * Storyteller chat AgentController (PLAN-V2 Phase 4.2).
 *
 * Mutations-only plan-first: the default `chat` mode exposes read-only tools +
 * `submit_plan` and physically cannot mutate (allowlist, not prompt begging).
 * A mutating request forces `submit_plan`; approval flips the session to
 * `build` (native plan→build via `transitionsTo`), where the full mutating CRUD
 * + beat-draft workflow are visible. See docs/STORYTELLER.md.
 *
 * Pure config factory — the backing agent + Postgres store are injected by the
 * `core/io/mastra-runtime` seam (this module never touches the Mastra instance
 * or storage directly, so `ai/` stays leaf-layer).
 */

import '@/shared/data/server-guard'
import type { AgentControllerConfig, AgentControllerMode } from '@mastra/core/agent-controller'
import { WORKSPACE_TOOLS } from '@mastra/core/workspace'
import { FeatureFlag, isFeatureEnabled } from '@/shared/data/constants/feature-flags'
import { readWorldBibleTool, checkContinuityTool } from '@/domains/storyteller/ai/tools/bible-tools'
import { checkSectionAlignmentTool } from '@/domains/storyteller/ai/tools/section-alignment-tool'
import { searchManuscriptTool } from '@/domains/storyteller/ai/tools/search-manuscript'
import { listBeatsTool } from '@/domains/storyteller/ai/tools/beat-tools'
import { listCharactersTool } from '@/domains/storyteller/ai/tools/character-tools'
import { proposeCharacterFieldsTool } from '@/domains/storyteller/ai/tools/propose-character-fields-tool'
import { listEpisodesTool } from '@/domains/storyteller/ai/tools/episode-tools'

export const STORYTELLER_CONTROLLER_ID = 'storyteller-chat'

export const STORYTELLER_CONTROLLER_ENV = FeatureFlag.StorytellerController

/** True when the flagged controller path should replace the legacy `StorytellerAgent.stream()`. */
export function isStorytellerControllerEnabled(): boolean {
  return isFeatureEnabled(FeatureFlag.StorytellerController)
}

/** Plan-first modes — reads answer in `chat`; mutations require an approved plan → `build`. */
export enum StorytellerControllerMode {
  Chat = 'chat',
  Build = 'build',
}

/** Built-in controller tool exposed name (from `@mastra/core/agent-controller`). */
const SUBMIT_PLAN_TOOL_NAME = 'submit_plan'

// Types derived from the controller config so `ai/` never imports storage internals.
type ControllerConfig = AgentControllerConfig
type ControllerAgent = NonNullable<ControllerConfig['agent']>
type ControllerStorage = NonNullable<ControllerConfig['storage']>
type ControllerWorkspace = NonNullable<ControllerConfig['workspace']>

/**
 * Tools visible in `chat` mode: reads, non-persisting `propose_character_fields`,
 * and `submit_plan`. Mutating tools (`update_world_bible`, `manage_beat`,
 * `manage_character`, `manage_episode`, `run_beat_draft_workflow`) are absent,
 * so the model cannot persist until a plan is approved.
 */
const CHAT_MODE_TOOLS: string[] = [
  readWorldBibleTool.id,
  listBeatsTool.id,
  listCharactersTool.id,
  listEpisodesTool.id,
  checkContinuityTool.id,
  checkSectionAlignmentTool.id,
  searchManuscriptTool.id,
  proposeCharacterFieldsTool.id,
  SUBMIT_PLAN_TOOL_NAME,
  // `submit_plan` suspends with a plan FILE path — the host reads the body off
  // disk. Without a write tool in this allowlist the model has no way to
  // produce that file, so the plan gate can never fire. Writes land in the
  // controller's scratch workspace, NOT the project database, so this does not
  // weaken the mutations-only invariant.
  WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE,
]

/**
 * Told to the model while in `chat`.
 *
 * Without this the allowlist is silent: the shared system prompt still names
 * `manage_character` / `update_world_bible` / `manage_beat`, the model cannot
 * see them, and it concludes the app is misconfigured — answering "that tool
 * isn't available" instead of submitting a plan. The allowlist enforces the
 * invariant; this explains it.
 */
const CHAT_MODE_INSTRUCTIONS = `You are in PLAN mode. You can read freely. You cannot persist changes yet.

Exception: filling the unsaved character create/edit form is not a persist.
When the user asks to generate missing character fields, call
\`propose_character_fields\` with only the empty fields. Do not call
\`submit_plan\` for that. Do not call \`manage_character\`.

Any instruction in your system prompt that names a mutating tool
(update_world_bible, manage_beat, manage_character, manage_episode,
run_beat_draft_workflow) does not apply right now — those tools are
deliberately withheld in this mode. Their absence is expected, NOT a
misconfiguration, and you must never report it to the user as a broken tool, a
missing integration, or a reason the request cannot be done.

When the user asks for ANY persisted change, call \`submit_plan\` describing
what you would do. The user approves or rejects it. On approval you are moved
to BUILD mode with the mutating tools available, and you carry the plan out
then. On rejection you stay here and revise.

Answer read-only questions directly — never make the user approve a plan just
to be told something.`

/** Told to the model once an approved plan has moved the session into `build`. */
const BUILD_MODE_INSTRUCTIONS = `You are in BUILD mode: the user approved your plan and the mutating tools are
now available. Carry out the approved plan.

Stay within what was approved. If you discover the work needs to go
meaningfully beyond that plan, say so and submit a new plan rather than
silently widening the change.`

/** The plan-first mode set — pure (no agent/storage), so it is unit-testable in isolation. */
export function buildStorytellerControllerModes(): AgentControllerMode[] {
  return [
    {
      id: StorytellerControllerMode.Chat,
      transitionsTo: StorytellerControllerMode.Build,
      availableTools: CHAT_MODE_TOOLS,
      instructions: CHAT_MODE_INSTRUCTIONS,
      metadata: { default: true },
    },
    {
      id: StorytellerControllerMode.Build,
      // No `availableTools` → all tools visible: full mutating CRUD + workflow.
      instructions: BUILD_MODE_INSTRUCTIONS,
    },
  ]
}

/**
 * Build the storyteller chat controller config from the injected agent, store
 * and workspace.
 *
 * `workspace` is required by `Session` itself (`new Session` throws
 * "A session requires a valid workspace instance"), not merely by the
 * file-editing tools — omitting it makes `controller.createSession()` throw
 * before a single token streams. It is injected rather than constructed here so
 * this module stays a pure config factory with no filesystem imports.
 */
export function buildStorytellerControllerConfig(deps: {
  agent: ControllerAgent
  storage: ControllerStorage
  workspace: ControllerWorkspace
}): ControllerConfig {
  return {
    id: STORYTELLER_CONTROLLER_ID,
    agent: deps.agent,
    storage: deps.storage,
    workspace: deps.workspace,
    defaultModeId: StorytellerControllerMode.Chat,
    modes: buildStorytellerControllerModes(),
  }
}
