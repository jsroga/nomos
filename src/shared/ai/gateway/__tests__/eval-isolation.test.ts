/**
 * Eval judge calls must never enter `llm_calls`.
 *
 * The scorers run against a golden set, not against a tenant's work. Routing
 * them through the gateway would write judge calls in as production spend,
 * inflating per-project totals with cost no project incurred and corrupting
 * the table SPEC-15's cost budget reads.
 *
 * So the scorers construct their own model, and `local`'s provider-SDK gate
 * exempts them by name. This asserts the exemption is not quietly undone —
 * the failure it guards against is someone "tidying up" by routing scorers
 * through the gateway, which looks like an improvement and is not.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SCORERS = 'src/shared/agent-kernel/scorers'
const GATEWAY_BARREL = /from ['"]@\/shared\/ai\/gateway(?:\/index)?['"]/

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap(entry => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) return filesUnder(path)
    return path.endsWith('.ts') ? [path] : []
  })
}

function importsGatewayBarrel(source: string): boolean {
  return GATEWAY_BARREL.test(source)
}

describe('eval scorers do not bill', () => {
  it('does not import the billing gateway barrel', () => {
    const offenders = filesUnder(SCORERS).filter(file =>
      importsGatewayBarrel(readFileSync(file, 'utf8'))
    )

    expect(offenders).toEqual([])
  })
})
