// Relative imports: Mastra Studio bundler emits unresolved `@/` into `.mastra/output`.
import { loadAgentInstructions } from './load-agent-instructions'
import { readPromptBlockContent } from './editor-overlay'
import { briefPromptBlockId } from '../prompts/prompt-block-id'

/** Overlay JSON brief when present; otherwise instructions.md. */
export function loadPublishedOrFileBrief(agentId: string): string {
  const overlay = readPromptBlockContent(briefPromptBlockId(agentId))
  if (overlay && overlay.trim().length > 0) return overlay.trim()
  return loadAgentInstructions(agentId)
}
