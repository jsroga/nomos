import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const SRC = 'src/domains/loop-creator/ai/agents/mastra/loop-creator-completion.ts'

describe('loop-creator Mastra completion tracing', () => {
  it('nests generate under withMastraSpan and hex tracingOptions', () => {
    const source = readFileSync(SRC, 'utf8')
    expect(source).toContain('withMastraSpan')
    expect(source).toContain('tracingOptions')
    expect(source).toContain('createMastraTraceId')
    expect(source).not.toContain('uuidv4')
    expect(source).toContain('getPublishedAgentOr')
    expect(source).toContain('parentSpanId')
    expect(source).toContain('resolveLoopCreatorMastraModel')
  })
})
