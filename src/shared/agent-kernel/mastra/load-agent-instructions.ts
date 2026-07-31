/**
 * Read `src/mastra/agents/<agentId>/instructions.md`.
 *
 * Used by `assembleFsAgent` and by agent `config.ts` instruction composers
 * when a dynamic slice must wrap the static brief. Bundling:
 * `next.config.js` `outputFileTracingIncludes` ships these `.md` files with
 * the serverless output.
 *
 * Paths resolve from the app repo root (not Mastra Studio cwd).
 */

import '@/shared/data/server-guard'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveProjectRoot } from '@/shared/agent-kernel/mastra/project-root'
import { FileEncoding } from '@/shared/data/constants/protocol'

const FILE_AGENTS_DIR = 'src/mastra/agents'
const INSTRUCTIONS_FILENAME = 'instructions.md'

/** Absolute path to a file-based agent's `instructions.md`. */
export function agentInstructionsPath(agentId: string): string {
  return join(resolveProjectRoot(), FILE_AGENTS_DIR, agentId, INSTRUCTIONS_FILENAME)
}

/** Directory containing Mastra file-based agent packages. */
export function fileAgentsRootDir(): string {
  return join(resolveProjectRoot(), FILE_AGENTS_DIR)
}

/** Read + trim the base instructions markdown for an agent id. */
export function loadAgentInstructions(agentId: string): string {
  return readFileSync(agentInstructionsPath(agentId), FileEncoding.Utf8).trim()
}

const MARKDOWN_FRONTMATTER_FENCE = '---'
const MARKDOWN_FRONTMATTER_CLOSE = `\n${MARKDOWN_FRONTMATTER_FENCE}`
const LEADING_BLANK_LINE = /^\s*\n/

/** Drop YAML frontmatter (`--- ... ---`) so skill bodies can be inlined into prompts. */
export function stripMarkdownFrontmatter(markdown: string): string {
  const trimmed = markdown.trim()
  if (!trimmed.startsWith(MARKDOWN_FRONTMATTER_FENCE)) return trimmed
  const end = trimmed.indexOf(MARKDOWN_FRONTMATTER_CLOSE, MARKDOWN_FRONTMATTER_FENCE.length)
  if (end < 0) return trimmed
  const after = trimmed.slice(end + MARKDOWN_FRONTMATTER_CLOSE.length)
  return after.replace(LEADING_BLANK_LINE, '').trim()
}
