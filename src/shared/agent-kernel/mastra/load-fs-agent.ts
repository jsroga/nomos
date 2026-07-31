/**
 * Assemble a production Agent from a Mastra file-based agent package under
 * `src/mastra/agents/<id>/` via `assembleAgentFromFsEntry`.
 *
 * Next/Trigger import Mastra as a library (no CLI FS discovery). This loader
 * keeps those runtimes in parity with Studio's file-based convention.
 *
 * Session plan: .local/sessions/ (file-based agents migration PLAN.md)
 */

import '@/shared/data/server-guard'
import {
  Agent,
  assembleAgentFromFsEntry,
  type FsAgentConfig,
} from '@mastra/core/agent'
import { loadAgentInstructions } from '@/shared/agent-kernel/mastra/load-agent-instructions'

export type AssembleFsAgentConfig = FsAgentConfig | Agent

/**
 * Build an `Agent` from an already-imported `config.ts` default export plus
 * on-disk `instructions.md` for the same directory name.
 *
 * If `config` already is an `Agent`, it is returned unchanged (escape hatch).
 * If `config.instructions` is a function, it wins over `instructions.md`
 * (Mastra precedence) — the function should compose the markdown when needed.
 */
export function assembleFsAgent(agentId: string, config: AssembleFsAgentConfig): Agent {
  if (config instanceof Agent) return config

  return assembleAgentFromFsEntry({
    name: agentId,
    config,
    instructionsMd: loadAgentInstructions(agentId),
  })
}
