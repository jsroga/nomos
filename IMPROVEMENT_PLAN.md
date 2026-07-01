# Storyteller Cleanup Improvement Plan

## Summary
`src/domains/storyteller` is already closer to the target architecture than some other modules, but the review found a few hard blockers to a safe cleanup: public route auth gaps, split persistence contracts, and no curated module boundary. The plan below prioritizes fixing the unsafe and correctness-sensitive seams first, then does the lowest-risk structural cleanup needed to align the slice with `docs/unified/ARCHITECTURE.md` without attempting a full behavioral rewrite. Larger migrations called out by the architecture review are deferred unless they can be done as pure extraction/refactoring.

## Prioritized items

### [P0] Close public auth/authorization gaps before refactoring route internals
- Problem: Several storyteller routes still bypass or skip authorization checks. The most severe cases are the forged `x-bypass-auth: system` path in `src/app/api/storyteller/episodes/route.ts`, unauthenticated episode/asset-generation endpoints under `src/app/api/storyteller/episodes/[episodeId]/*` and `src/app/api/storyteller/beats/[beatId]/*`, the public workflow resume/debug route in `src/app/api/storyteller/workflow/resume/route.ts`, authenticated IDORs in `src/app/api/storyteller/relationships/route.ts` and `src/app/api/storyteller/chat/route.ts`, raw PATCH allowlist gaps in `src/app/api/storyteller/beats/[beatId]/route.ts` and `src/app/api/storyteller/characters/[characterId]/route.ts`, and tool execution paths that trust model-supplied resource IDs (`findings/security.md`).
- Impact: These issues make the cleanup surface actively unsafe: unauthorized reads/writes, cross-project mutation, arbitrary job triggering, and forged internal calls are all possible today. Refactoring around these seams without fixing them first would preserve or spread dangerous contracts.
- Change: Standardize storyteller route entrypoints on `requireAuth()`/`withAuth()`, parameter/body validation, and `verifyProjectAccess()` / `verifyEpisodeAccess()` / `verifyBeatAccess()` before any DB read, write, or task trigger. Remove header-based internal bypasses from public HTTP routes and move any legitimate internal episode creation into a server-only service. For Mastra tools and server services, bind protected resource IDs from verified server context instead of trusting IDs emitted by the model.
- Effort: L
- Verification: Focused route tests for unauthorized, cross-project, and allowed-owner cases; manual smoke checks for episode CRUD and generation triggers; `npm run typecheck`; `npm run lint`.
- Depends on: None.

### [P0] Canonicalize storyteller write paths and fix mutation contracts that currently lie or drift
- Problem: Story-plan data is split across `projects.storyPlan` and `storyPlans.content`, with inconsistent readers/writers in `src/domains/storyteller/tools/world-building-tools.ts`, `src/app/api/storyteller/actions/route.ts`, `src/domains/storyteller/services/ContextAssemblyService.ts`, and `src/domains/storyteller/services/EntityAutoLinkerService.ts` (`findings/quality.md`). In the same mutation layer, `create_episode` sends fields that `src/app/api/storyteller/episodes/route.ts` silently drops; unsupported action types fall through to a success response in `src/app/api/storyteller/actions/route.ts`; and beat create/delete/reorder logic breaks contiguous sequencing invariants.
- Impact: These are behavior-affecting correctness bugs, not cosmetic debt. Users can see stale story context, lose generated episode data, receive false-positive success responses, or end up with duplicate/skipped beat ordering.
- Change: Choose one canonical story-plan persistence path and route all reads/writes through one server service. If an intermediate migration is required, dual-write in one transaction and make all readers prefer the same source first. Align the episode-creation contract so the tool schema/description matches persisted fields. Replace the loose action dispatcher with a shared discriminated union or equivalent explicit handler map that fails unsupported actions loudly. Centralize beat ordering in a transactional service that enforces contiguous `1..N` per episode for create/delete/reorder.
- Effort: L
- Verification: Targeted tests for story-plan read/write consistency, episode creation payload persistence, unsupported action handling, and beat ordering after create/delete/reorder; `npm run typecheck`; `npm run lint`.
- Depends on: None.

### [P1] Introduce a curated `storyteller` public contract and reroute external imports through it
- Problem: `src/domains/storyteller` still has no top-level `index.ts`, and external consumers import internals directly from `components/`, `hooks/`, `services/`, `core/`, `prompts/`, and `agents/` (for example `src/app/app/[projectId]/storyteller/page.tsx` and API routes such as `src/app/api/storyteller/chat/stream/route.ts`). The current agents barrel also exposes a broader surface than the actual public contract, while `src/domains/storyteller/lib/access-verification.ts` contains incidental helper surface like `getUserProjects()` (`findings/architecture.md`).
- Impact: Without a curated barrel, the module cannot enforce boundaries or be safely reshaped. Even low-risk cleanup work stays coupled to folder layout and internal implementation details.
- Change: Add `src/domains/storyteller/index.ts` as the only external entry point, then migrate `app/` and other cross-module consumers to import from it instead of deep paths. Trim `src/domains/storyteller/agents/index.ts` to what should remain public, keep helpers file-private unless they are part of the module contract, and explicitly decide which UI/hooks/types are supported external surface versus internal implementation.
- Effort: M
- Verification: Search-based check that external `@/domains/storyteller/...` deep imports are removed or intentionally grandfathered; `npm run typecheck`; `npm run lint`.
- Depends on: P0 auth and mutation fixes should land first for routes/services whose signatures will be exported.

### [P1] Make API routes thin adapters by extracting storyteller server services and server-only boundaries
- Problem: Storyteller routes still carry domain orchestration, DB writes, context assembly, custom error shaping, and workflow logic inline — especially `src/app/api/storyteller/chat/route.ts`, `src/app/api/storyteller/chat/stream/route.ts`, and `src/app/api/storyteller/workflow/resume/route.ts`. The architecture review also found impure `core/` code and client-importable code under `services/` (`findings/architecture.md`).
- Impact: Business logic is hard to test, duplicated across routes, and mixed into HTTP concerns. This blocks the cleanup goal of removing dead code and tightening types because the same behavior is embedded in large handlers instead of reusable seams.
- Change: Extract route-owned persistence/orchestration into server-only storyteller services (and, where already appropriate, agent/task entrypoints) that `app/` calls as thin glue. Add `import 'server-only'` to true server layers, move client-only polling helpers out of `services/`, and keep `core/` pure data-in/data-out. For this cleanup pass, prioritize extraction of the existing logic rather than redesigning the runtime model.
- Effort: L
- Verification: Service-level unit tests for extracted orchestration helpers where practical, route smoke tests to confirm response shapes stay stable, `npm run typecheck`, `npm run lint`.
- Depends on: P0 auth fixes; P0 write-path canonicalization; P1 public barrel can proceed in parallel once exported seams are chosen.

### [P1] Tighten typed boundaries and normalize error handling at the most important seams
- Problem: The weakest storyteller boundaries are still loosely typed: many routes use raw `await req.json()` checks, workflow steps in `src/domains/storyteller/agents/StoryWorkflow/StoryWorkflow.ts` use `z.any()` / `any`, some tool execute paths accept `args: any`, and core types still expose broad escape hatches (`findings/architecture.md`, `findings/quality.md`). The chat stream route also contains sentinel-thread fallback logic (`project-undefined`) that can merge unrelated memory threads.
- Impact: Cleanup work is risky when route, tool, and workflow contracts are implicit. Bad inputs can silently degrade into fallback text or shared memory collisions instead of failing at the boundary.
- Change: Introduce shared Zod DTOs for storyteller API bodies/responses and reuse them across routes, `io`, tools, and workflow steps where possible. Replace `z.any()` workflow boundaries with explicit `inputSchema` / `outputSchema`, infer types inward, and normalize unsupported/invalid-input handling into predictable 4xx/5xx responses. Fix thread-key construction in `chat/stream` so fallback threads are explicit and non-colliding.
- Effort: M
- Verification: Typecheck should fail if route/tool/workflow contracts drift; add focused tests for invalid payloads and thread-key generation; `npm run typecheck`; `npm run lint`.
- Depends on: P1 route/service extraction is helpful but not strictly required.

### [P2] Remove incidental exports/dead code and pin the cleanup with regression tests
- Problem: The review found dead or misleading surface area (`UPDATE_KEY_CHARACTERS` schema/dispatcher drift, incidental exports, internal helpers left visible) and noted that critical storyteller routes currently have no direct tests under `src/app/api/storyteller/**/*.{test,spec}.*` (`findings/quality.md`, `findings/architecture.md`).
- Impact: Even after the higher-priority fixes land, dead branches and untested contracts make the module easy to regress during future cleanup. Test gaps are part of why unsupported actions and dropped payload fields survived.
- Change: Remove or privatize dead exports and unreachable action code once the canonical handlers are in place. Add focused regression coverage around the extracted action dispatch, story-plan consistency, episode creation persistence, beat ordering, and route auth/authorization behavior. Keep the test scope narrow and behavior-preserving.
- Effort: M
- Verification: New targeted tests pass; dead exports are no longer referenced; `npm run test:unit`; `npm run typecheck`; `npm run lint`.
- Depends on: P0 and P1 items above, because tests should lock the cleaned-up seams rather than the current drift.

## Suggested sequence
1. **First increment (shippable, high-value):** land the route and tool auth/authorization fixes, remove the public auth bypass, and close the most obvious IDORs. This is independently valuable and reduces risk before any structural cleanup.
2. **Second increment:** unify story-plan persistence and repair the mutation contracts in `episodes` and `actions`, including unsupported action handling and beat ordering. This gives the module one trustworthy write path before extraction.
3. **Third increment:** add `src/domains/storyteller/index.ts`, shrink the public surface, and migrate `app/` consumers away from deep imports while extracting the now-stable server logic into server-only services.
4. **Fourth increment:** tighten DTOs/workflow step schemas and normalize error handling on the extracted seams.
5. **Final increment:** remove incidental/dead code and add the focused regression suite that locks in the cleanup.

## Deferred / out of scope
- **Full folder-by-folder convergence to the §4 blueprint** (`ui/state/io/core/services/agents/tasks/prompts`) is deferred. The review is correct that storyteller is not fully there, but a wholesale file move would add churn beyond a behavior-preserving cleanup. This plan only does the minimum boundary work needed to make later reshaping safe.
- **Large server-state migration to TanStack Query + `io/` as the only client/server edge** is deferred. The architecture finding is valid, but converting all storyteller reads/writes and cache behavior would be a broader runtime change than this cleanup pass should carry.
- **Replacing bespoke polling/status flows with the Trigger Realtime job model** is deferred for the same reason. The plan preserves current behavior and focuses on extracting and guarding the existing implementation first.
- **Collapsing the custom AI orchestration stack fully onto Mastra-native workflows/memory/tracing** is deferred. The review surfaced real debt, but that is a dedicated architecture migration rather than a narrow cleanup.
- **Schema-source consolidation and snake_case/camelCase cleanup across the entire module** is only addressed where required by the canonical story-plan write path. A full persistence-layer migration should follow once the public contract and services are stable.
