/** Messages and defaults for the env schema. Values only — no logic. */

export const ENV_PARSE_FAILED = 'Environment is not configured correctly:'

export const ENV_DEFAULT = {
  /** Voyage's default embedding model when none is configured. */
  EmbeddingModel: 'voyage-3',
} as const

export const ENV_FLAG_ON = 'true'
