/**
 * Storyteller chat AgentController (PLAN-V2 Phase 4.2).
 *
 * Mutations-only plan-first: the default `chat` mode exposes read-only tools +
 * `submit_plan` and physically cannot mutate (allowlist, not prompt begging).
 * A mutating request forces `submit_plan`; approval flips the session to
 * `build` (native plan→build via `transitionsTo`), where the full mutating CRUD
 * + beat-draft workflow are visible. See docs/adr/agent-controller-chat.md.
 *
 * Pure config factory — the backing agent + Postgres store are injected by the
 * `core/io/mastra-runtime` seam (this module never touches the Mastra instance
 * or storage directly, so `ai/` stays leaf-layer).
 */

import '@/shared/data/server-guard'
import type { AgentControllerConfig, AgentControllerMode } from '@mastra/core/agent-controller'
import { readWorldBibleTool, checkContinuityTool } from '@/domains/storyteller/ai/tools/bible-tools'
import { listBeatsTool } from '@/domains/storyteller/ai/tools/beat-tools'
import { listCharactersTool } from '@/domains/storyteller/ai/tools/character-tools'
import { listEpisodesTool } from '@/domains/storyteller/ai/tools/episode-tools'

export const STORYTELLER_CONTROLLER_ID = 'storyteller-chat'

/** Env flag (`STORYTELLER_CONTROLLER=1`) that routes chat through the controller. */
const CONTROLLER_FLAG_ENABLED = '1'
export const STORYTELLER_CONTROLLER_ENV = 'STORYTELLER_CONTROLLER'

/** True when the flagged controller path should replace the legacy `StorytellerAgent.stream()`. */
export function isStorytellerControllerEnabled(): boolean {
  return process.env[STORYTELLER_CONTROLLER_ENV] === CONTROLLER_FLAG_ENABLED
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

/**
 * Read-only tools visible in `chat` mode. Mutating tools (`update_world_bible`,
 * `manage_beat`, `manage_character`, `manage_episode`, `run_beat_draft_workflow`)
 * are absent, so the model cannot even see them until a plan is approved.
 */
const CHAT_MODE_TOOLS: string[] = [
  readWorldBibleTool.id,
  listBeatsTool.id,
  listCharactersTool.id,
  listEpisodesTool.id,
  checkContinuityTool.id,
  SUBMIT_PLAN_TOOL_NAME,
]

/** The plan-first mode set — pure (no agent/storage), so it is unit-testable in isolation. */
export function buildStorytellerControllerModes(): AgentControllerMode[] {
  return [
    {
      id: StorytellerControllerMode.Chat,
      transitionsTo: StorytellerControllerMode.Build,
      availableTools: CHAT_MODE_TOOLS,
      metadata: { default: true },
    },
    {
      id: StorytellerControllerMode.Build,
      // No `availableTools` → all tools visible: full mutating CRUD + workflow.
    },
  ]
}

/** Build the storyteller chat controller config from the injected agent + store. */
export function buildStorytellerControllerConfig(deps: {
  agent: ControllerAgent
  storage: ControllerStorage
}): ControllerConfig {
  return {
    id: STORYTELLER_CONTROLLER_ID,
    agent: deps.agent,
    storage: deps.storage,
    defaultModeId: StorytellerControllerMode.Chat,
    modes: buildStorytellerControllerModes(),
  }
}
