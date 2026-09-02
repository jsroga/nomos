/**
 * Gate fixture — MUST fail the edge-runtime import restriction.
 *
 * A disabled gate looks exactly like a passing gate, so the rule that keeps
 * Node-only code out of the Edge proxy ships with a file that violates it.
 * Asserted by scripts/__tests__/gate-fixtures.test.ts. Never imported by src/.
 */
// Expected error: no-restricted-imports (Edge runtime)
import { db } from '@/db'
// Expected error: no-restricted-imports (Edge runtime)
import { readFileSync } from 'node:fs'

export const fixture = { db, readFileSync }
