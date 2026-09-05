import '@/shared/data/server-guard'
import { createHash } from 'node:crypto'
import { lookupPromptBody, PROMPT_BODIES } from './prompt-registry-table'

export { lookupPromptBody } from './prompt-registry-table'

/** SHA-256 hex of a prompt body. Eval freshness hashes this module’s files too. */
export function hashPromptBody(body: string): string {
  return createHash('sha256').update(body).digest('hex')
}

export interface PromptRegistryEntry {
  readonly id: string
  readonly body: string
  readonly hash: string
}

export function promptRegistryEntry(id: string, body: string): PromptRegistryEntry {
  return { id, body, hash: hashPromptBody(body) }
}

function hashedRegistry(): Record<string, PromptRegistryEntry> {
  const out: Record<string, PromptRegistryEntry> = {}
  for (const id of Object.keys(PROMPT_BODIES)) {
    const body = lookupPromptBody(id)
    if (body.length === 0) continue
    out[id] = promptRegistryEntry(id, body)
  }
  return out
}

/** Hashed bodies. UI imports ids + lookupPromptBody from the table, not this hash map. */
export const PROMPT_REGISTRY: Record<string, PromptRegistryEntry> = hashedRegistry()
