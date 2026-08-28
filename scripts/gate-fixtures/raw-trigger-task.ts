/**
 * Gate fixture — MUST fail `local/no-raw-trigger-task`.
 *
 * A disabled gate looks exactly like a passing gate, so every structural rule
 * ships with a file that proves it is switched on. Asserted by
 * scripts/__tests__/gate-fixtures.test.ts. Never imported by src/.
 */
import { task, schemaTask } from '@trigger.dev/sdk'

// Expected error: local/no-raw-trigger-task — no schema, no queue, no key.
export const unhardened = task({
  id: 'fixture-raw-task',
  run: async (payload: { projectId: string }) => payload.projectId,
})

// Expected error: local/no-raw-trigger-task — a schema alone is not enough.
export const unqueued = schemaTask({
  id: 'fixture-schema-task',
  run: async () => null,
})
