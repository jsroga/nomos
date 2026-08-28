/**
 * SPEC-13's burn-down meter.
 *
 * Ratchets, never equality — see the harness note in specs/README.md. The
 * Mastra count is tracked but not driven to zero: this spec routes model
 * *construction* through the gateway and leaves the agent framework in place.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { inventory } from '../inventory/index.mjs'
import { ProviderSdkBucket, classifyProviderSdkImport } from '../inventory/matchers.mjs'

const RATCHET = JSON.parse(readFileSync('.quality-ratchet.json', 'utf8'))

function imports(bucket: string): string[] {
  const result = inventory((line: string, file: string) =>
    classifyProviderSdkImport(line, file) === bucket ? bucket : null
  )
  return result.byBucket[bucket] ?? []
}

describe('direct provider SDK imports', () => {
  it('does not grow the count outside the gateway', () => {
    const direct = [
      ...imports(ProviderSdkBucket.AiSdk),
      ...imports(ProviderSdkBucket.AiSdkProvider),
      ...imports(ProviderSdkBucket.OpenAi),
      ...imports(ProviderSdkBucket.Replicate),
    ]

    expect(direct.length).toBeLessThanOrEqual(RATCHET.providerSdkImportsOutsideGateway)
  })

  it('drives LangChain to zero — it is removed, not fenced', () => {
    expect(imports(ProviderSdkBucket.LangChain).length).toBeLessThanOrEqual(
      RATCHET.langChainImports
    )
  })
})
