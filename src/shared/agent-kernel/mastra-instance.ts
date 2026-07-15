import type { Mastra } from '@mastra/core/mastra'
import type { PostgresStore } from '@mastra/pg'
import { createMastra, createPostgresStore } from '@/shared/agent-kernel/mastra/create-mastra'
import { consumeMastraRegistrations } from '@/shared/agent-kernel/mastra/runtime-registry'
import {
  LIST_JOIN_SEPARATOR,
  MASTRA_STORAGE_INITIALIZED_LOG,
} from '@/shared/agent-kernel/constants/mastra-instance'

let mastraInstance: Mastra | null = null
let storageInstance: PostgresStore | null = null

/**
 * Get or create Postgres storage instance for memory persistence
 * See: https://mastra.ai/docs/agents/agent-memory
 */
export function getStorageInstance(): PostgresStore {
  if (!storageInstance) {
    storageInstance = createPostgresStore()
    console.log(MASTRA_STORAGE_INITIALIZED_LOG)
  }
  return storageInstance
}

/**
 * The single production Mastra instance (never create a second one).
 *
 * Agents and workflows come from the runtime registry — domains push their
 * runtime modules there at import time (dependency inversion; shared/ may
 * not import domains). See `mastra/runtime-registry.ts` for the ordering
 * contract.
 */
export function getMastraInstance(): Mastra {
  if (!mastraInstance) {
    const { agents, workflows } = consumeMastraRegistrations()
    mastraInstance = createMastra(agents, {
      storage: getStorageInstance(),
      workflows,
    })
    console.log(
      `🚀 [Mastra] Centralized instance initialized — agents: [${Object.keys(agents).join(LIST_JOIN_SEPARATOR)}], workflows: [${Object.keys(workflows).join(LIST_JOIN_SEPARATOR)}]`
    )
  }
  return mastraInstance
}
