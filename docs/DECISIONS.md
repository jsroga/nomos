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

**Bad.** Type churn across every service that reads tenant data — 57 exported signatures at the time of writing. Converted one seam at a time. All 57 have moved, so `local/no-bare-project-id-param` is now `error` rather than report-only: the count cannot grow back.

The rule's escape hatch (`// project-scope: none — <reason>`) applies to the one declaration it sits above, never to a file. Three kinds of use are legitimate and each must say which it is: code that runs in the browser and reaches data only through an authenticated route; cache eviction that reads no project data; and pure functions over rows the caller already fetched. Anything else takes a scope.

`verifyProjectAccess` is now internal to `shared/auth`. Every one of its ~64 former call sites establishes access through `projectScope()` or `tryProjectScope()`, and `no-restricted-imports` makes reaching past them a lint error, pinned by a fixture.

`tryProjectScope` answers `null` rather than throwing, because each route refuses with its own status and message. That is not the boolean this ADR replaced: the scope *is* the return value, so a caller that skips the null check has nothing to pass onward and does not compile.

**Accepted risk.** A raw SQL query that skips the repository layer is still unprotected. The SDK-ownership gate (ADR 0001) is what makes that hard to write.

### Verification

```bash
# The guarantee itself — this must NOT compile:
#   worldTileService.listForProject('any-project-id')
#   → Argument of type 'string' is not assignable to parameter of type 'ProjectScope'
npx vitest run src/shared/auth/__tests__/project-scope.test.ts
npx eslint src 2>&1 | grep -c 'no-bare-project-id-param'   # 0; the rule is 'error'
grep -rn 'verifyProjectAccess' src --include='*.ts' | grep -v src/shared/auth   # tests only
npx vitest run scripts/__tests__/gate-fixtures.test.ts     # the rule still fails what it must
```

---

## ADR 0003 — One model gateway, and every call costed

**Status:** accepted, 2026-08-28 · **Supersedes:** nothing · **Related:** [ADR 0002](#adr-0002--projectscope-tenancy-as-a-type)

### Context

Not one call site captured the `usage` object providers return. Everything the codebase called "tokens" was an estimate, in a single `console.log` of a context-window guess. There was no per-project, per-user or per-feature attribution, no budget, no anomaly detection, and no way to answer *"did that prompt change make generation three times more expensive?"* except by reading the invoice a month later.

For a product whose unit economics **are** model spend, that was the largest missing instrument. It also compounded with the tenancy findings: `entities/resolve` triggers LLM summary generation, and had its auth hole stayed open, nothing would have shown the abuse until the bill arrived. Cost instrumentation is a security control here, not only a finance one.

### Decision

Every paid call goes through `@/shared/ai/gateway`, which writes one `llm_calls` row per call: tokens, cost, latency, feature, model, and outcome.

**The gateway takes a `ProjectScope`, not a project id.** ADR 0002's guarantee extends to spend — you cannot bill a project you have not proved you own.

**Cost is computed from a committed price table, never fetched.** `PROVIDER_PRICING` is versioned by `effectiveFrom`, so a historical row keeps the price that applied when it ran. An unknown model **throws**: a silent zero reads as "this was free", which is worse than no instrumentation.

**Recording never fails the call.** Writes are fire-and-forget with the error caught and counted. A metering outage must not take generation down, and that trade is only defensible in this direction.

**Retries live in the gateway; the SDK's own retry is off.** A retried call costs twice, so each attempt records separately. One merged result would hide the second charge.

**Eval judges do not bill.** Scorers run against a golden set, not a tenant's work. Routing them through the gateway would enter judge calls as production spend, inflating per-project totals and corrupting the table the eval cost budget reads. They construct their own model, the A2 gate exempts them, and a test asserts they import no part of the gateway — because routing them through it would look like tidying up.

**`llm_calls` has no foreign key to `projects`.** A deleted project keeps its cost history, or last month's spend changes when someone tidies up. No partitioning or retention at current volume; revisit both past ~1M rows.

**Frameworks stay; only model construction moves.** Mastra keeps its tool-calling loop. Rewriting 115 call sites into a bespoke abstraction is a different and worse project.

**LangChain is removed.** Twelve of its sixteen imports were message classes used as data, so the dependency was carrying a struct; only four constructed a model.

### Consequences

**Good.** Spend is answerable — `npm run spend -- --days 7`, by project, feature and model. A prompt change's cost is measurable rather than guessed. `outcome: schema_fail` gives action 18 the alias-retirement signal it needs.

**Bad.** One more module every model call passes through, and a price table that has to be maintained by hand as providers change rates.

**The scope travels in `AsyncLocalStorage`, not in signatures.** Mastra agents are reached from twenty call sites holding no `ProjectScope`, but the scope is constant for a request — threading it would move a value that never changes. A boundary that has proved the project opens a context; the meter reads it.

The rule that makes that safe: **no context means no row.** A model call outside a billing boundary is left unrecorded rather than attributed to a guess, because a row against the wrong project is worse than a missing one.

**Accepted risk.** `llm_calls` is a floor, not a guaranteed total. Six files still reach a provider directly — each named with its reason in `eslint-rules/provider-sdk-exemptions.js` and counted by `providerSdkImportsOutsideGateway` — and any call made outside a boundary records nothing by design. Reconcile against a provider dashboard before treating a total as exact.

### Verification

```bash
npx eslint src 2>&1 | grep -c 'Call models through'   # ≤ providerSdkImportsOutsideGateway
grep -rn '@langchain' src --include='*.ts'            # 0
npx vitest run src/shared/ai/gateway
npm run spend -- --days 7
```

---

## ADR 0004 — Contracts: parse once, at the edge

**Status:** accepted, 2026-08-28 · **Supersedes:** nothing · **Related:** [ADR 0002](#adr-0002--projectscope-tenancy-as-a-type)

### Context

The codebase reads untyped JSON far more often than it parses it: over a
thousand `recordFromJson` / `readString` calls against 62 `safeParse`. Those
guards are not a mistake — this repo bans `as`, and they were the honest way to
handle data whose shape nobody had declared.

**The problem is where they run.** Guarding field by field at every reader means
the shape is never established anywhere. Each reader re-derives it, and a
payload that lost a field produces `undefined` at whichever of the thousand
sites happens to touch it first — far from the cause, and only on the path that
read it.

Database and provider spellings leak the same way in the other direction.
`image_filename` and `model_urls` reached UI components, so a column rename was
a full-text search rather than an edit.

### Decision

One `contracts/` module per aggregate: the Zod schema, the inferred row type,
the domain type, and the mappers. Parse once at the edge; pass typed values
inward. **snake_case exists only inside a mapper.**

`safeParse` at a boundary we do not control — a request body (answer 400), a
provider response, a JSONB column written by older code (degrade rather than
break). `parse` where a bad shape is a bug in this codebase and should throw
loudly; a `safeParse` there invites a fallback that hides corruption.

**Strip, strict and passthrough are three different things, and the default is
strip.** `z.object()` drops an unknown key rather than rejecting it, which is
usually right: it keeps what is known and refuses to carry what is not, so a
stray spelling cannot spread. `.strict()` on a legacy column means one
unrecognised key discards the whole record. `.passthrough()` belongs only at a
provider or model boundary — a model can emit anything, and strictness there
converts a bad generation into a crash — and every survivor carries a
`contract-boundary:` marker naming why.

A field the contract *forgot* is caught by a test asserting the mapper writes
back exactly the keys the schema declares, not by strictness.

### Consequences

**Good.** A column rename is one file. A reader gets a type instead of a guard.
A hand-written twenty-line field-by-field parser becomes a schema and a mapper,
and the compiler names every site that has to move — which is how converting
the pilot surfaced a duplicate `'completed'` enum that a loose union had been
quietly accepting.

**Bad, and stated plainly: this ends with the guard count still in four
figures.** Six aggregates across three modules is what the spec converts; the
rest is ordinary work under a gate. The ratchet stops the number growing and
`local/no-untyped-json-read` stops new code adding to it, scoped module by
module — `warn` while a module still has sites, `error` once it reaches zero.
Half-done is therefore a **stable** state rather than a broken one: converted
modules cannot regress, unconverted ones cannot grow.

**Accepted risk.** A strict schema can reject real production data. The pilot
parses production-shaped fixtures before the pattern spreads, and the stored
shape uses strip precisely so a legacy key cannot discard a record.

### Verification

```bash
npx vitest run scripts/__tests__/untyped-json-inventory.test.ts
npx vitest run src/domains/3d-asset-exporter/contracts
npx eslint src/domains/3d-asset-exporter   # local/no-untyped-json-read
```
