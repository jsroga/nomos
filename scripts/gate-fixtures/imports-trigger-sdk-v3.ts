/**
 * Gate fixture — MUST fail `local/no-raw-trigger-task`'s v3 message.
 *
 * CLAUDE.md mandates the v4 entrypoint. Asserted by
 * scripts/__tests__/gate-fixtures.test.ts. Never imported by src/.
 */
// Expected error: local/no-raw-trigger-task
import { logger } from '@trigger.dev/sdk/v3'

export async function loadLoggerDynamically() {
  // Expected error: local/no-raw-trigger-task
  const dynamic = await import('@trigger.dev/sdk/v3')
  return { logger, dynamic }
}
