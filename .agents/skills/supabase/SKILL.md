---
name: supabase
description: Use Supabase correctly in this repo — service-role admin client, auth, and storage — without leaking secrets or bypassing RLS carelessly
---

# Supabase

Work with Supabase (auth, storage, service-role access). Extra context from the
user:

> {{user_input}}

This repo uses `@supabase/supabase-js` and `@supabase/auth-helpers-nextjs`. Key
files:

- `src/lib/supabase-admin.ts` — lazy **service-role** client (`supabaseAdmin`).
- `src/infrastructure/storage/supabase.ts` + `StorageService.ts` — storage.
- `src/lib/auth.ts` — auth/user context for routes.
- `src/app/auth/callback/route.ts` — OAuth callback.

## Which client to use

| Context | Client | Notes |
| --- | --- | --- |
| Server-side privileged op (Trigger tasks, admin routes) | `supabaseAdmin` from `@/lib/supabase-admin` | service-role key, **bypasses RLS** |
| User-scoped server request | auth-helpers server client via `src/lib/auth.ts` | respects the signed-in user + RLS |
| Browser | auth-helpers browser client | anon key only |

**Never** use the service-role key in client code or ship it to the browser.

## The lazy admin client (important pattern)

`supabaseAdmin` is a `Proxy` that constructs the real client on first use:

```ts
import { supabaseAdmin } from '@/lib/supabase-admin'

const { data, error } = await supabaseAdmin.from('projects').select('*').eq('id', id)
if (error) throw error
```

Why lazy: Trigger.dev indexes task files at build time **without** Supabase env
vars. A top-level `createClient(...)` would throw during indexing. Always reach
for `supabaseAdmin` instead of constructing a new client at module load in code
that a task might import.

Required env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server),
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (client/auth).

## Data access

- Prefer the project's **Drizzle** layer (`src/db/schema.ts`) for structured
  relational access; use the Supabase client for auth, storage, and features
  Drizzle doesn't cover. Match whatever the surrounding service already does.
- Always check `error` before using `data`:

```ts
const { data, error } = await supabaseAdmin.from('table').select().single()
if (error) throw new Error(error.message)
```

- Prefer narrow `select('col1,col2')` over `select('*')` on hot paths.
- Keep queries inside the `src/services/*` layer so REST and MCP share them.

## Auth

- Derive the user via `src/lib/auth.ts` in route handlers; don't re-implement
  session parsing.
- Enforce authorization at the boundary before privileged `supabaseAdmin` calls —
  the service-role client bypasses RLS, so **you** are the access check.

## Storage

- Go through `src/infrastructure/storage/*` (`StorageService`, `supabase.ts`)
  rather than calling the storage API ad-hoc.
- Use signed URLs for private objects; never expose the service-role key to
  generate client-side access.

## Security guardrails

- Service-role key: server-only. Never log it, never send to the client, never
  commit it. Keep it in env (`.env.local`, not tracked).
- Because service-role bypasses RLS, every `supabaseAdmin` write/read must be
  gated by an explicit ownership/permission check you perform.
- Validate untrusted input (Zod) before it reaches a query.
- Don't disable RLS on tables to "make it work" — scope access in code instead.

## Anti-patterns

- ❌ `createClient(url, serviceRoleKey)` at module top-level in task-imported code
  (breaks Trigger indexing) — use `supabaseAdmin`.
- ❌ Using the service-role client for user-scoped requests that should respect RLS.
- ❌ `select('*')` then filtering in JS instead of in the query.
- ❌ Ignoring the `{ error }` field.

## Quick reference

| Need | Use |
| --- | --- |
| Privileged server op | `supabaseAdmin` from `@/lib/supabase-admin` |
| User-scoped request | auth-helpers server client (`src/lib/auth.ts`) |
| Storage read/write | `src/infrastructure/storage/*` |
| Structured relational data | Drizzle (`src/db/schema.ts`) |

## Common patterns

```ts
// Guarded admin write (service-role bypasses RLS — you enforce access)
const user = await getUser(req)                 // src/lib/auth.ts
if (!user || !ownsProject(user, projectId)) return unauthorized()
const { error } = await supabaseAdmin
  .from('projects').update({ favorite: true }).eq('id', projectId)
if (error) throw new Error(error.message)
```

```ts
// Signed URL for a private object (never expose the service-role key)
const { data, error } = await supabaseAdmin
  .storage.from('bucket').createSignedUrl(path, 60)
```

Deliverable: the Supabase access implemented with the right client, gated by an
explicit auth check, secrets kept server-side, typecheck + lint clean.
