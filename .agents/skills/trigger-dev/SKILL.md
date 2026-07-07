---
name: trigger-dev
description: Write and trigger Trigger.dev v4 tasks correctly in this repo (SDK v4, never client.defineJob)
---

# Trigger.dev (v4)

Work with Trigger.dev background tasks. Extra context from the user:

> {{user_input}}

This project uses **Trigger.dev v4** (`@trigger.dev/sdk@4`). Tasks live in
`src/trigger/*` (e.g. `generate-portrait.ts`, `remesh-3d-model.ts`,
`generate-episode-poster.ts`, `select-mj-variant.ts`) and are commonly enqueued
from `src/services/tiles.service.ts` and API routes under `src/app/api/*`.

## Golden rule

Always use `@trigger.dev/sdk`. **Never** use the deprecated v2
`client.defineJob(...)` — it breaks the app.

## Define a task

```ts
import { task } from '@trigger.dev/sdk'

export const processData = task({
  id: 'process-data',
  retry: { maxAttempts: 5, factor: 1.8, minTimeoutInMs: 500, maxTimeoutInMs: 30_000 },
  run: async (payload: { userId: string }) => {
    // long-running work, no timeouts
    return { ok: true }
  },
})
```

Validated payloads:

```ts
import { schemaTask } from '@trigger.dev/sdk'
import { z } from 'zod'

export const validated = schemaTask({
  id: 'validated',
  schema: z.object({ id: z.string(), amount: z.number() }),
  run: async (payload) => ({ charged: payload.amount }),
})
```

## Trigger a task (from backend / routes / services)

```ts
import { tasks } from '@trigger.dev/sdk'
import type { processData } from '@/trigger/process-data'

const handle = await tasks.trigger<typeof processData>('process-data', { userId: '123' })
// batch: tasks.batchTrigger<typeof processData>('process-data', [{ payload: {...} }, ...])
```

Use `import type` for the task reference to keep the route bundle clean. Follow
the existing pattern in `tiles.service.ts` for enqueue + run-status polling.

## Trigger from inside a task (mind Result vs Output)

```ts
const result = await childTask.triggerAndWait({ data: 'x' })
if (result.ok) {
  use(result.output)   // actual return value
} else {
  handle(result.error)
}
```

`triggerAndWait` / `batchTriggerAndWait` return a **Result** (`ok`/`output`/`error`),
not the raw output. Never wrap `triggerAndWait`, `batchTriggerAndWait`, or `wait.*`
in `Promise.all` / `Promise.allSettled` — unsupported.

## Useful features

- **Idempotency:** `idempotencyKeys.create(key)` + `{ idempotencyKey }` for
  payment/critical ops.
- **Debounce:** `{ debounce: { key, delay: '5s', mode?: 'leading'|'trailing' } }`
  for webhook/activity bursts.
- **Concurrency:** `queue({ name, concurrencyLimit })` or per-task
  `queue: { concurrencyLimit: 1 }`.
- **Waits:** `wait.for({ seconds })`, `wait.until({ date })`, `wait.forToken(...)`
  — waits > 5s are checkpointed and don't burn compute.
- **Machines:** `machine: { preset: 'large-1x' }` for heavy work; `maxDuration`.
- **Metadata:** `metadata.set/increment/append` for progress on long tasks.
- **Tags:** `await tags.add('user_123')` (≤ 10/run) for filtering/subscriptions.
- **Logging:** `logger.info/debug/error`, `logger.trace(name, fn)` for spans.

## Repo-specific gotchas (from CLAUDE.md)

- **Build imports without env:** task files may be indexed at build time. Use the
  lazy `supabaseAdmin` proxy (`src/lib/supabase-admin.ts`) rather than creating a
  Supabase client at module load, so indexing doesn't require env vars.
- **Deploy/OTEL conflict:** if deploy fails with "cannot merge resource due to
  conflicting Schema URL", use `npm run trigger:deploy` (sets
  `OTEL_TRACES_EXPORTER=none`).
- **PENDING_VERSION on prod:** prod needs a promoted deployment —
  `npx trigger.dev@latest deploy --env prod` (promotes by default).
- **Dev:** `npm run trigger:dev`.

## Anti-patterns

- ❌ `client.defineJob(...)` (v2 — forbidden).
- ❌ Reading `result.output` without checking `result.ok`.
- ❌ `Promise.all([...triggerAndWait])` or wrapping `wait.*`.
- ❌ Instantiating clients that need env at task module top-level.

Deliverable: the task/trigger implemented with SDK v4 patterns, matching existing
`src/trigger/*` files, typecheck + lint clean.
