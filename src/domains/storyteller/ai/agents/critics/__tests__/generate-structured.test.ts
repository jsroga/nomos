import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('generateStructured tracing', () => {
  it('nests generate under a Mastra span with tracingOptions', () => {
    const source = readFileSync(
      'src/domains/storyteller/ai/agents/critics/generate-structured.ts',
      'utf8'
    )
    expect(source).toContain('withMastraSpan')
    expect(source).toContain('tracingOptions')
    expect(source).toContain('currentGatewayContext')
    expect(source).toContain('GenerateStructuredSpan')
  })
})
