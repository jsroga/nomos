/**
 * Builds the Mastra `Observability` registry (AI tracing + log/score forwarding).
 *
 * Shape follows https://mastra.ai/docs/observability/overview: a single named
 * config (`default`) with explicit exporters, an explicit `SensitiveDataFilter`
 * span processor, and `logging` forwarding. Kept out of `create-mastra.ts` so
 * the exporter/sampling decisions are unit-testable without booting Mastra.
 */

import type { LogLevel, ObservabilityExporter } from '@mastra/core/observability'
import { SpanType } from '@mastra/core/observability'
import {
  ConsoleExporter,
  MastraPlatformExporter,
  MastraStorageExporter,
  Observability,
  SamplingStrategyType,
  SensitiveDataFilter,
} from '@mastra/observability'
import type { SamplingStrategy } from '@mastra/observability'
import {
  MASTRA_OBSERVABILITY_CONFIG_NAME,
  MASTRA_OBSERVABILITY_DEFAULT_LOG_LEVEL,
  MASTRA_OBSERVABILITY_ENV_ENABLED,
  MASTRA_OBSERVABILITY_LOG_LEVELS,
  MASTRA_SAMPLE_RATIO_MAX,
  MASTRA_SAMPLE_RATIO_MIN,
  MastraObservabilityEnv,
  MastraObservabilityLog,
} from '@/shared/agent-kernel/constants/mastra-observability'
import { MASTRA_OBSERVABILITY_SERVICE } from '@/shared/agent-kernel/constants/mastra-bootstrap'

export interface ObservabilityBuildOptions {
  /** The storage exporter is only useful when a Mastra store is configured. */
  hasStorage: boolean
  /** Injectable for tests; defaults to `process.env`. */
  env?: Record<string, string | undefined>
}

/** Which exporters a given environment produces — surfaced for tests and logging. */
export interface ObservabilityPlan {
  exporters: ObservabilityExporter[]
  exporterNames: string[]
  sampling: SamplingStrategy
  logLevel: LogLevel
  excludeSpanTypes: SpanType[]
}

function isEnabled(value: string | undefined): boolean {
  return value?.trim() === MASTRA_OBSERVABILITY_ENV_ENABLED
}

function resolveSampling(env: Record<string, string | undefined>): SamplingStrategy {
  const raw = env[MastraObservabilityEnv.SampleRatio]?.trim()
  if (!raw) return { type: SamplingStrategyType.ALWAYS }

  const probability = Number(raw)
  const isValid =
    Number.isFinite(probability) &&
    probability >= MASTRA_SAMPLE_RATIO_MIN &&
    probability <= MASTRA_SAMPLE_RATIO_MAX

  if (!isValid) {
    console.warn(MastraObservabilityLog.InvalidSampleRatio, raw)
    return { type: SamplingStrategyType.ALWAYS }
  }

  if (probability >= MASTRA_SAMPLE_RATIO_MAX) return { type: SamplingStrategyType.ALWAYS }
  if (probability <= MASTRA_SAMPLE_RATIO_MIN) return { type: SamplingStrategyType.NEVER }
  return { type: SamplingStrategyType.RATIO, probability }
}

function resolveLogLevel(env: Record<string, string | undefined>): LogLevel {
  const raw = env[MastraObservabilityEnv.LogLevel]?.trim()
  if (!raw) return MASTRA_OBSERVABILITY_DEFAULT_LOG_LEVEL

  const match = MASTRA_OBSERVABILITY_LOG_LEVELS.find((level) => level === raw)
  if (!match) {
    console.warn(MastraObservabilityLog.InvalidLogLevel, raw)
    return MASTRA_OBSERVABILITY_DEFAULT_LOG_LEVEL
  }
  return match
}

/**
 * Resolve the exporter set + sampling for an environment without instantiating
 * `Observability`. Exported for tests; `createObservability` is the real entry.
 */
export function planObservability(options: ObservabilityBuildOptions): ObservabilityPlan {
  const env = options.env ?? process.env
  const exporters: ObservabilityExporter[] = []
  const exporterNames: string[] = []

  if (options.hasStorage) {
    exporters.push(new MastraStorageExporter())
    exporterNames.push(MastraStorageExporter.name)
  }

  if (env[MastraObservabilityEnv.PlatformAccessToken]?.trim()) {
    exporters.push(new MastraPlatformExporter())
    exporterNames.push(MastraPlatformExporter.name)
  }

  if (isEnabled(env[MastraObservabilityEnv.ConsoleExporter])) {
    exporters.push(new ConsoleExporter())
    exporterNames.push(ConsoleExporter.name)
  }

  // Per-chunk model spans multiply span volume by ~the token count of every
  // stream; dropped unless explicitly re-enabled.
  const excludeSpanTypes = isEnabled(env[MastraObservabilityEnv.ModelChunkSpans])
    ? []
    : [SpanType.MODEL_CHUNK]

  return {
    exporters,
    exporterNames,
    sampling: resolveSampling(env),
    logLevel: resolveLogLevel(env),
    excludeSpanTypes,
  }
}

/**
 * Build the registry, or `undefined` when nothing would consume the spans
 * (no storage, no platform token, no console exporter) — passing an exporterless
 * `Observability` would pay the tracing cost and throw the data away.
 */
export function createObservability(options: ObservabilityBuildOptions): Observability | undefined {
  const plan = planObservability(options)

  if (plan.exporters.length === 0) {
    console.warn(MastraObservabilityLog.Disabled)
    return undefined
  }

  return new Observability({
    configs: {
      [MASTRA_OBSERVABILITY_CONFIG_NAME]: {
        serviceName: MASTRA_OBSERVABILITY_SERVICE,
        sampling: plan.sampling,
        exporters: plan.exporters,
        // Explicit even though the registry auto-applies one: it documents the
        // guarantee and is the hook for extra `sensitiveFields` later.
        spanOutputProcessors: [new SensitiveDataFilter()],
        excludeSpanTypes: plan.excludeSpanTypes,
        logging: { enabled: true, level: plan.logLevel },
      },
    },
  })
}
