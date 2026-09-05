/** Retention bounds for Mastra thread messages. Window size is not this cap. */

/** Age after which a `mastra_messages` row is prune-eligible. */
export const MEMORY_MESSAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000

/** Maximum `mastra_messages` rows kept per thread after prune. */
export const MEMORY_THREAD_MESSAGE_CAP = 100
