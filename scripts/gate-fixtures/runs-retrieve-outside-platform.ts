/**
 * Gate fixture — MUST fail `local/trigger-runs-ownership`.
 *
 * A disabled gate looks exactly like a passing gate, so every structural rule
 * ships with a file that proves it is switched on. Asserted by
 * scripts/__tests__/gate-fixtures.test.ts. Never imported by src/.
 */
import { runs } from '@trigger.dev/sdk'

export async function readAnyRun(runId: string) {
  // Expected error: local/trigger-runs-ownership
  return runs.retrieve(runId)
}

export async function cancelAnyRun(runId: string) {
  // Expected error: local/trigger-runs-ownership
  return runs.cancel(runId)
}
