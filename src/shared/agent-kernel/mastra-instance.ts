import type { Mastra } from '@mastra/core/mastra'
import type { PostgresStore } from '@mastra/pg'
import { createMastra, createPostgresStore } from '@/shared/agent-kernel/mastra/create-mastra'
import {
  consumeMastraRegistrations,
  setMastraInstanceInvalidator,
} from '@/shared/agent-kernel/mastra/runtime-registry'
import {
  LIST_JOIN_SEPARATOR,
  MASTRA_STORAGE_INITIALIZED_LOG,
  MASTRA_STORAGE_WARM_FAILED_LOG,
} from '@/shared/agent-kernel/constants/mastra-instance'

let mastraInstance: Mastra | null = null
let storageInstance: PostgresStore | null = null

setMastraInstanceInvalidator(() => {
  mastraInstance = null
})

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

let storageWarmPromise: Promise<void> | null = null

/**
 * Run the Postgres schema/migration setup that Mastra otherwise defers to the
 * first agent call. Measured at ~30s cold, which lands entirely on the user's
 * first chat turn; after it, a turn costs ~3s. Memoized so concurrent callers
 * share one init, and cleared on failure so a later attempt can retry.
 */
export function warmMastraStorage(): Promise<void> {
  if (!storageWarmPromise) {
    storageWarmPromise = (async () => {
      try {
        await getStorageInstance().init()
      } catch (err: unknown) {
        storageWarmPromise = null
        console.warn(MASTRA_STORAGE_WARM_FAILED_LOG, err)
      }
    })()
  }
  return storageWarmPromise
}

/**
 * The single production Mastra instance (never create a second one concurrently).
 *
 * Agents and workflows come from the runtime registry — domains push their
 * runtime modules there at import time (dependency inversion; shared/ may
 * not import domains). See `mastra/runtime-registry.ts`.
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
