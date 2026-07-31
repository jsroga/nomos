import { describe, expect, it, vi } from 'vitest'
import { SpanType } from '@mastra/core/observability'
import { SamplingStrategyType } from '@mastra/observability'
import {
  createObservability,
  planObservability,
} from '@/shared/agent-kernel/mastra/observability-config'
import { MastraObservabilityEnv } from '@/shared/agent-kernel/constants/mastra-observability'

const EMPTY_ENV: Record<string, string | undefined> = {}

describe('planObservability', () => {
  it('registers the storage exporter only when a store is configured', () => {
    expect(planObservability({ hasStorage: true, env: EMPTY_ENV }).exporterNames).toEqual([
      'MastraStorageExporter',
    ])
    expect(planObservability({ hasStorage: false, env: EMPTY_ENV }).exporterNames).toEqual([])
  })

  it('adds the platform exporter when an access token is present', () => {
    const plan = planObservability({
      hasStorage: true,
      env: { [MastraObservabilityEnv.PlatformAccessToken]: 'tok_123' },
    })
    expect(plan.exporterNames).toEqual(['MastraStorageExporter', 'MastraPlatformExporter'])
  })

  it('adds the console exporter behind an explicit flag', () => {
    const plan = planObservability({
      hasStorage: false,
      env: { [MastraObservabilityEnv.ConsoleExporter]: '1' },
    })
    expect(plan.exporterNames).toEqual(['ConsoleExporter'])
  })

  it('drops per-chunk model spans unless re-enabled', () => {
    expect(planObservability({ hasStorage: true, env: EMPTY_ENV }).excludeSpanTypes).toEqual([
      SpanType.MODEL_CHUNK,
    ])
    expect(
      planObservability({
        hasStorage: true,
        env: { [MastraObservabilityEnv.ModelChunkSpans]: '1' },
      }).excludeSpanTypes
    ).toEqual([])
  })

  it('maps the sample ratio onto a sampling strategy', () => {
    const ratio = planObservability({
      hasStorage: true,
      env: { [MastraObservabilityEnv.SampleRatio]: '0.25' },
    }).sampling
    expect(ratio).toEqual({ type: SamplingStrategyType.RATIO, probability: 0.25 })

    expect(
      planObservability({ hasStorage: true, env: { [MastraObservabilityEnv.SampleRatio]: '1' } })
        .sampling
    ).toEqual({ type: SamplingStrategyType.ALWAYS })

    expect(
      planObservability({ hasStorage: true, env: { [MastraObservabilityEnv.SampleRatio]: '0' } })
        .sampling
    ).toEqual({ type: SamplingStrategyType.NEVER })
  })

  it('falls back to always-sample on an unparseable ratio', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const plan = planObservability({
      hasStorage: true,
      env: { [MastraObservabilityEnv.SampleRatio]: 'lots' },
    })
    expect(plan.sampling).toEqual({ type: SamplingStrategyType.ALWAYS })
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('forwards info-and-above logs by default and honours an override', () => {
    expect(planObservability({ hasStorage: true, env: EMPTY_ENV }).logLevel).toBe('info')
    expect(
      planObservability({ hasStorage: true, env: { [MastraObservabilityEnv.LogLevel]: 'warn' } })
        .logLevel
    ).toBe('warn')
  })

  it('rejects an unknown log level', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(
      planObservability({ hasStorage: true, env: { [MastraObservabilityEnv.LogLevel]: 'loud' } })
        .logLevel
    ).toBe('info')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('createObservability', () => {
  it('returns undefined when nothing would consume the spans', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(createObservability({ hasStorage: false, env: EMPTY_ENV })).toBeUndefined()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('registers a default instance when an exporter exists', () => {
    const observability = createObservability({ hasStorage: true, env: EMPTY_ENV })
    expect(observability?.hasInstance('default')).toBe(true)
  })
})
