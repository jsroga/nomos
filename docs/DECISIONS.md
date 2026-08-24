# Architecture decisions

Append-only log. Each entry states the context, the decision, the alternatives that were rejected and why, and how to verify the decision still holds. Newest last.

A rule that appears here without an enforcing command is advice, not architecture — say which it is.

---

## ADR 0001 — Data access and the role of Row-Level Security

**Status:** accepted · **Date:** 2026-08-24
**Supersedes:** the unstated assumption that RLS protects all data access.

### Context

The application has three concurrent data-access idioms with three different security postures:

| Idiom | Where | RLS applies? | Call sites |
|---|---|---|---|
| Drizzle over a raw `pg` pool | services, routes, tasks | **No** | dominant |
| Supabase request-scoped client | `withAuth` handlers | **Yes** | ~46 routes |
| Supabase **service-role** client | tasks, storage | No, by design | 19 |

Eighteen migrations enable RLS on 41 tables. For the Drizzle path they never fire:

```
src/db/client.ts       drizzle(new Pool({ connectionString: process.env.DATABASE_URL }))
.env.local.example     DATABASE_URL=postgresql://postgres:…      ← BYPASSRLS role
grep request.jwt.claims|set_config src supabase   → no matches
```

Drizzle connects as `postgres`, which carries `BYPASSRLS`, and nothing propagates the caller's JWT, so `auth.uid()` would be `NULL` even if the role did not bypass. Since the application works, the role is bypassing them.

Two functions named `verifyProjectAccess` encode the confusion directly:

- `shared/auth/project-access.ts` — `(projectId, userId)`, a Drizzle query comparing `projects.userId`. **52 callers.**
- `shared/data/api-utils.ts` — `(supabase, projectId)`, a select that returns rows only if RLS lets it. **20 callers.**

Same name, different contracts, and whether a route is safe depends on which one it happened to import.

### Decision

**RLS is defence-in-depth for the Supabase-client paths. It is not the tenancy control.**

The tenancy control is application-level and type-enforced: one `verifyProjectAccess(projectId, userId)` today, and a branded `ProjectScope` token (ADR 0002) that repository functions require, so a forgotten check fails to compile.

Concretely:

1. **One `verifyProjectAccess`**, the Drizzle one, in `shared/auth/project-access.ts`. The Supabase-client variant is deleted and its 20 call sites migrated.
2. **RLS policies stay.** They are correct for the paths they cover and are real defence in depth for Supabase-client reads. They are not removed, and they are not relied upon.
3. **Every migration enabling RLS says so in its own header**, so a reader learns the limitation where they encounter the policy.
4. **The Drizzle client lives in one module** and provider/DB SDK imports are fenced to it.
5. **Service-role acquisition is named and logged** — `serviceRoleClient(reason)` — so "who bypasses RLS and why" is a query, not archaeology.

### Alternatives considered

**A — Make RLS real.** Route Drizzle through a per-request connection setting `request.jwt.claims`, or move reads onto the Supabase client.

Rejected, on cost and on strength. Cost: connection pooling becomes materially harder, every query pays a `SET LOCAL`, service paths need explicit escapes, and 31 service files change. Strength: RLS catches a forgotten check *at runtime*; `ProjectScope` catches it *at build time*. Choosing A would buy a weaker guarantee for a larger migration.

This is reversible. If pooling stops being a constraint, A can be layered on top of B — they are not exclusive, and B's single `verifyProjectAccess` is a prerequisite for A anyway.

**C — Leave it.** Rejected: the current state is the only indefensible one. Policy that never evaluates creates a false sense of a backstop, which is precisely how 30-odd routes came to omit their own check.

### Consequences

**Good.** One meaning for "the access check". A forgotten check becomes a compile error rather than a runtime hope. Pooling stays simple. The security model is written down and can be argued with.

**Bad.** Authorization lives in application code, so it is only as good as the gates enforcing it — which is why ADR 0002, `local/no-discarded-auth-context`, and the route-conformance test are load-bearing rather than optional. A raw SQL query that skips the repository layer is unprotected; the SDK-ownership gate exists to make that hard to write.

**Accepted risk.** Until `ProjectScope` lands, tenancy is still enforced by remembering to call a function. The ratchet `routesTakingProjectIdWithoutOwnershipCheck` is at 0 and may not increase.

### Verification

```bash
grep -rn "export async function verifyProjectAccess" src        # exactly 1
grep -rn "createSupabaseServiceClient()\|supabaseAdmin" src | grep -v shared/persistence   # empty
npx drizzle-kit generate                                        # empty diff
npm run qualitygate:ratchet
```


---

## ADR 0002 — `ProjectScope`: tenancy as a type

**Status:** accepted · **Date:** 2026-08-24
**Depends on:** ADR 0001, which chose application-level tenancy over RLS.

### Context

Every tenancy hole found in this codebase had one shape: a function took a bare `projectId: string`, and somewhere up the call chain nobody remembered to check it. Thirty-odd routes were fixed by adding the missing check. That fixes today's holes and does nothing about tomorrow's, because a `string` carries no evidence of having been verified — a reviewer cannot tell a checked id from an unchecked one by looking at a signature.

ADR 0001 ruled out RLS as the control. Something has to take its place, and prose in a guide is what produced the holes.

### Decision

**Ownership is a type.** `ProjectScope` is a branded token whose only constructors are `projectScope(projectId, userId)` — which performs the check and throws `ProjectForbidden` — and `systemScope(projectId, reason)` for work with no user.

Repository functions, use cases and services take a `ProjectScope` instead of a `projectId: string`. A caller that has not done the check has nothing to pass, so **the route fails to compile** rather than failing in production.

Supporting rules:

- **The brand is a real module-private `Symbol`,** not a `declare`d type-only marker. An object literal cannot reach the key, so the token is unforgeable at runtime as well as at compile time.
- **Scopes are request-lifetime.** A scope proves ownership *at the moment it was minted*; caching one across requests reintroduces the bug with extra steps.
- **`ProjectForbidden` maps to 404, never 403.** A 403 confirms the resource exists.
- **`systemScope` requires a `SystemScopeReason` and logs every acquisition.** Tasks legitimately act with no user; the point is that the escape is countable, not invisible. Tracked as `systemScopeSites`.
- **Derived scopes extend it.** `EpisodeScope`, `BeatScope` and `CharacterScope` are `ProjectScope`s, so anything taking a project scope accepts them and the ownership JOIN is not repeated.

### Alternatives considered

**A class.** Rejected: `new ProjectScope(…)` is constructible, so the guarantee leaks.

**A runtime assertion at the repository boundary** (`assertScoped(projectId)`). Rejected: it fires at runtime, which is what RLS would have done more cheaply, and it cannot be checked in review.

**Doing nothing beyond the added checks.** Rejected: that is the state that produced the holes, and the check count only grows.

### Consequences

**Good.** A forgotten check is a build error. "Has this been verified?" is answerable from a signature. The escape hatch is enumerable.

**Bad.** Type churn across every service that reads tenant data — 57 exported signatures at the time of writing. Converted one seam at a time, with the old form kept until its last caller moves.

**Accepted risk.** A raw SQL query that skips the repository layer is still unprotected. The SDK-ownership gate (ADR 0001) is what makes that hard to write.

### Verification

```bash
# The guarantee itself — this must NOT compile:
#   worldTileService.listForProject('any-project-id')
#   → Argument of type 'string' is not assignable to parameter of type 'ProjectScope'
npx vitest run src/shared/auth/__tests__/project-scope.test.ts
npx eslint src 2>&1 | grep -c 'no-bare-project-id-param'   # ≤ bareProjectIdExports
npm run qualitygate:ratchet
```
