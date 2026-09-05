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
import { REMAINDER } from '../../eslint-rules/provider-sdk-exemptions.js'

const RATCHET = JSON.parse(readFileSync('.quality-ratchet.json', 'utf8'))

function imports(bucket: string): string[] {
  const result = inventory((line: string, file: string) =>
    classifyProviderSdkImport(line, file) === bucket ? bucket : null
  )
  return result.byBucket[bucket] ?? []
}

describe('direct provider SDK imports', () => {
  /**
   * The count of *files* granted an A2 exemption, not of import lines.
   *
   * ESLint is the real gate — it distinguishes a spending export from a
   * utility, which a text scan cannot. This asserts the exemption list does
   * not grow: every entry is a named gap in the gateway migration.
   */
  it('does not grow the list of files exempted from gate A2', () => {
    expect(REMAINDER.length).toBeLessThanOrEqual(RATCHET.providerSdkImportsOutsideGateway)
  })

  it('drives LangChain to zero — it is removed, not fenced', () => {
    expect(imports(ProviderSdkBucket.LangChain).length).toBeLessThanOrEqual(
      RATCHET.langChainImports
    )
  }, 60_000)
})
