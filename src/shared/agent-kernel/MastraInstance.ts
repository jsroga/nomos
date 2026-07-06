import type { Mastra } from '@mastra/core/mastra'
import type { PostgresStore } from '@mastra/pg'
import { createMastra, createPostgresStore } from '@/shared/agent-kernel/mastra/create-mastra'

let mastraInstance: Mastra | null = null
let storageInstance: PostgresStore | null = null

/**
 * Get or create Postgres storage instance for memory persistence
 * See: https://mastra.ai/docs/agents/agent-memory
 */
export function getStorageInstance(): PostgresStore {
  if (!storageInstance) {
    storageInstance = createPostgresStore()
    console.log('💾 [Mastra] Storage initialized with Postgres')
  }
  return storageInstance
}

export function getMastraInstance(): Mastra {
  if (!mastraInstance) {
    mastraInstance = createMastra({}, { storage: getStorageInstance() })
    console.log('🚀 [Mastra] Centralized instance initialized with memory storage')
  }
  return mastraInstance
}
