import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('fix-inconsistencies SSE start wiring', () => {
  it('runs the workflow inside gateway context and a Mastra span', () => {
    const source = readFileSync(
      'src/domains/storyteller/core/io/fix-inconsistencies-sse-run.ts',
      'utf8'
    )
    expect(source).toContain('withGatewayContext')
    expect(source).toContain('withMastraSpan')
    expect(source).toContain('tracingOptions')
    expect(source).toContain('onStep')
  })

  it('binds createRun to the project resourceId', () => {
    const source = readFileSync(
      'src/domains/storyteller/core/io/fix-inconsistencies-run.ts',
      'utf8'
    )
    expect(source).toContain('createRun({ resourceId: projectId })')
    expect(source).toContain('run.watch')
  })

  it('flushes SSE comments so the spinner is not waiting on start()', () => {
    const source = readFileSync(
      'src/app/api/storyteller/consistency/fix-run/route.ts',
      'utf8'
    )
    expect(source).toContain('encodeFixInconsistenciesSseComment')
    expect(source).toContain('SseAccelBuffering.No')
    expect(source).toContain('createMastraTraceId')
  })
})
