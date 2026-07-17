/**
 * Load a file-based agent's base instructions from the Mastra convention path
 * `src/mastra/agents/<agentId>/instructions.md` (hybrid file-based agents pilot).
 *
 * The markdown holds the STATIC base prompt prose (editable in Studio / by
 * non-engineers); the code-based agent appends its dynamic parts (banned-phrase
 * lists, shared rules, runtime context). Server-only — reads from disk at
 * module init.
 *
 * Bundling: `next.config.js` `outputFileTracingIncludes` ships these `.md` files
 * with the serverless output. (Trigger.dev deploys are a follow-up.)
 */

import '@/shared/data/server-guard'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const FILE_AGENTS_DIR = 'src/mastra/agents'
const INSTRUCTIONS_FILENAME = 'instructions.md'
const FILE_ENCODING = 'utf8'

/** Absolute path to a file-based agent's `instructions.md`. */
export function agentInstructionsPath(agentId: string): string {
  return join(process.cwd(), FILE_AGENTS_DIR, agentId, INSTRUCTIONS_FILENAME)
}

/** Read + trim the base instructions markdown for an agent id. */
export function loadAgentInstructions(agentId: string): string {
  return readFileSync(agentInstructionsPath(agentId), FILE_ENCODING).trim()
}
