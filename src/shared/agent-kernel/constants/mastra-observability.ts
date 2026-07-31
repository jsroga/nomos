/**
 * Env keys and defaults for the Mastra AI-tracing registry (`Observability`).
 *
 * Mirrors https://mastra.ai/docs/observability/overview — one named config
 * (`default`) with explicit exporters, a sensitive-data span processor and
 * log forwarding.
 */

export enum MastraObservabilityEnv {
  /** Set to send spans/logs/scores to Mastra Cloud (the platform exporter reads it itself). */
  PlatformAccessToken = 'MASTRA_PLATFORM_ACCESS_TOKEN',
  PlatformProjectId = 'MASTRA_PLATFORM_PROJECT_ID',
  /** `0`–`1`; anything else (or unset) means always-sample. */
  SampleRatio = 'MASTRA_TRACE_SAMPLE_RATIO',
  /** `1` to add the console exporter (local debugging without a database). */
  ConsoleExporter = 'MASTRA_TRACE_CONSOLE',
  /** `1` to keep per-chunk model spans, which are dropped by default. */
  ModelChunkSpans = 'MASTRA_TRACE_MODEL_CHUNKS',
  /** Minimum level forwarded to observability storage (independent of PinoLogger). */
  LogLevel = 'MASTRA_OBSERVABILITY_LOG_LEVEL',
}

/** Registry key of the single tracing config; `default` is what Mastra selects unset. */
export const MASTRA_OBSERVABILITY_CONFIG_NAME = 'default'

/** Truthy marker for the boolean-ish env switches above. */
export const MASTRA_OBSERVABILITY_ENV_ENABLED = 'true'

/**
 * Console/file logs stay at PinoLogger's level; only `info`+ is persisted so
 * the traces table does not fill with debug chatter.
 */
export const MASTRA_OBSERVABILITY_DEFAULT_LOG_LEVEL = 'info'

export const MASTRA_OBSERVABILITY_LOG_LEVELS = [
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
] as const

export const MASTRA_SAMPLE_RATIO_MIN = 0
export const MASTRA_SAMPLE_RATIO_MAX = 1
export const MASTRA_SAMPLE_RATIO_RADIX = 10

export enum MastraObservabilityLog {
  Disabled = '⚠️ [Mastra] Observability disabled — no storage, no platform token, no console exporter.',
  InvalidSampleRatio = '⚠️ [Mastra] Ignoring MASTRA_TRACE_SAMPLE_RATIO (expected a number between 0 and 1):',
  InvalidLogLevel = '⚠️ [Mastra] Ignoring MASTRA_OBSERVABILITY_LOG_LEVEL (expected debug|info|warn|error|fatal):',
}
