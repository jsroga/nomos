import type { AgentEditorConfig } from '@mastra/core/agent'

/**
 * Studio may edit instructions; tool membership stays in code.
 * Typed as `AgentEditorConfig` (widened) so function `instructions` remain
 * legal on the Agent constructor — the literal `{ instructions: true }` form
 * forbids a code-owned brief.
 */
export const EDITOR_INSTRUCTIONS_ONLY: AgentEditorConfig = {
  instructions: true,
}

/** Studio may edit instructions and tool descriptions, not tool membership. */
export const EDITOR_INSTRUCTIONS_AND_TOOL_DESCRIPTIONS: AgentEditorConfig = {
  instructions: true,
  tools: { description: true },
}

/** Ephemeral agents (provider probe, tests). */
export const EDITOR_DISABLED: AgentEditorConfig = false
