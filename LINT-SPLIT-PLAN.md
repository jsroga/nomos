# Lint Backlog — 2-Agent Split

**Total: 481 ESLint errors** (warnings like `complexity`/`max-lines` non-strict are excluded). Baseline: `npx eslint "src/**/*.{ts,tsx}"`. Split is **by disjoint directory** so the two agents never touch the same file.

## Rule mix (whole repo)
| count | rule | typical fix |
|---|---|---|
| 197 | `no-explicit-any` | real types / generics / `unknown` + guards (no `any`) |
| 104 | `no-non-null-assertion` | guard + early return, `??`, narrowing (no `!`) |
| 58 | `local/complexity-strict` (>25) | extract helpers, one at a time |
| 22 | `unused-imports/no-unused-vars` | remove or `_`-prefix |
| 19 | `semi` / 13 `quotes` | autofixable — `eslint --fix` per file |
| 16 | `no-restricted-imports` | cross-domain/barrel boundary — move code to `@/shared` or fix path |
| 15 | `no-dynamic-delete` | `Reflect.deleteProperty` / rebuild object without key |
| 8 | `no-duplicate-enum-values` | dedupe or make it a `const` map |
| 8 | `consistent-type-assertions` | drop `as` — use guards/official types |
| 8 | `prefer-literal-enum-member` | inline literals in enum members |
| 8 | `local/max-lines-strict` (>800) | split file, one extract per gate |

## Ground rules (both agents — binding)
- **No `as`** (`assertionStyle: 'never'`, `as const` only), **no `any`**, no ternary-spread walls. Prefer official types, zod guards, `@/shared/data/json-guards` helpers. See [[typescript-cast-policy]].
- **No bulk codegen** on `src/**` (`node -e`, heredocs). Edit incrementally, one file at a time.
- Run `npm run qualitygate:file -- <path>` after each file; rescan every 5 fixes.
- **Stay in your directory set.** Never edit a file in the other agent's set.
- Autofix first: `npx eslint --fix <file>` clears `semi`/`quotes`, then hand-fix the rest.

## Agent A — storyteller + shared + platform (~234 errors)
```
src/domains/storyteller/**        131
src/shared/chat/**                 38
src/shared/agent-kernel/**         19
src/shared/ai/**                   12
src/shared/data/**                 10
src/shared/auth/**                  7
src/components/**                    9
src/mcp/**                          6
src/shared/observability/**         1
src/db/**                           1
```

**Structural split priority (metrics gate — Agent A only):**

| File | Issue |
|---|---|
| `src/shared/chat/state/useChatStream.ts` | 1068 lines, complexity 103 |
| `src/shared/chat/ui/AgentLog.tsx` | 1194 lines, complexity 47/56 |
| `src/domains/storyteller/**` | Remaining storyteller lint after wave 0 |

Split pattern: `constants/` + slice modules; preserve SSE wire contract (`sse-wire-contract` skill). Dead wire: `StorytellerCustomEvent` enum (no consumers after store migration).

## Agent B — asset/game domains + app + trigger (~247 errors)

**Owner scope** (disjoint from Agent A — do not touch `src/domains/storyteller/**`, `src/shared/**`, `src/components/**`, `src/mcp/**`, `src/db/**`):

```
src/domains/world-building-toolkit/**   60
src/domains/loop-creator/**             45
src/domains/game-design/**              34
src/domains/interior-designer/**        30
src/domains/3d-asset-exporter/**        28
src/domains/marketing/**                12
src/app/api/**                          23
src/app/(workspace)/**                   2
src/trigger/utils/**                    13
```

**Rescan baseline (2026-07-14):** ~~247~~ → **~120** errors across ~70 files after Pass 1–2 session (LoopCreatorLayout, generate-tile.task, PropertiesPanel, game-design agents, 3d-exporter, Sidebar, llm-logger, useWorldUiStore dynamic-delete, generate-3d route). Re-run eslint glob to refresh.

| count | rule | Agent B notes |
|---:|---|---|
| 123 | `no-explicit-any` | Dominant — game-design agents, 3d tasks, world-gen tasks |
| 42 | `no-non-null-assertion` | UpscaleService, API routes, interior panels |
| 29 | `local/complexity-strict` | Split/extract before typing huge handlers |
| 15 | `no-dynamic-delete` | loop-creator `state.ts`, object rebuild pattern |
| 11 | `no-restricted-imports` | Cross-domain imports → `@/shared` seam |
| 11 | `unused-imports/no-unused-vars` | Quick wins after CustomEvent cleanup |
| 4 | `local/max-lines-strict` | See split targets below |
| other | assertions, enums, quotes | One file at a time |

### Already landed in Agent B set (do not redo)

| Track | Status |
|---|---|
| Magic-string (`local/no-magic-string`) | **0** in all Agent B paths |
| CustomEvent → stores | **Done** — `useWorldUiStore` (world-gen review/MJ grid), interior `Toolbar` uses `setMode` directly |
| `npm run typecheck` | **0** — must stay green |

### Out of scope for Agent B (Agent A owns)

These were in the earlier “Lane B hotspots” list but live in **Agent A** directories:

- `src/shared/chat/state/useChatStream.ts` (1068 lines, complexity 103)
- `src/shared/chat/ui/AgentLog.tsx` (1194 lines, complexity 47/56)

Agent A should split those; Agent B must not edit them.

### Agent B execution plan (merge with structural split lane)

Work in **three passes** — autofix quick wins first, then file splits (drops complexity + max-lines), then typing (`any` / `!`).

#### Pass 1 — Quick wins (~30 min, ~25 errors)

Autofix + trivial fixes, `qualitygate:file` each:

1. `quotes` / `semi` — `npx eslint --fix` on any file that still has them
2. `unused-imports` — Sidebar (post–CustomEvent), API routes, marketing leftovers
3. `no-empty-pattern` — `src/app/api/generate-3d/route.ts` (and siblings)
4. Small `no-duplicate-enum-values` — grep set, dedupe or `const` map

#### Pass 2 — File splits (metrics gate; ~40 errors)

One extract per `qualitygate:file` until metrics clean. Pattern: `constants/` + thin composer (same as LandingPage / interior store).

| Priority | File | errs | Why first |
|---:|---|---:|---|
| 1 | `src/domains/loop-creator/ui/LoopCreatorLayout.tsx` | 12 | max-lines + complexity; central loop UI |
| 2 | `src/domains/world-building-toolkit/tasks/generate-tile.task.ts` | 12 | max-lines + 3× complexity |
| 3 | `src/domains/interior-designer/ui/UI/PropertiesPanel.tsx` | 8 | max-lines + complexity |
| 4 | `src/domains/world-building-toolkit/ui/Sidebar/Sidebar.tsx` | 2+ | max-lines (939); split panel sections |
| 5 | `src/trigger/utils/llm-logger.ts` | 13 | `extractImageUrls` complexity 26 — extract to `trigger/constants/` + helper module |
| 6 | `src/domains/world-building-toolkit/ui/TileReviewDialog.tsx` | 5 | complexity after review flow extract |
| 7 | `src/app/api/generate-3d/route.ts` | 3 | complexity 34 — provider branches → `app/api/constants/` + helpers |
| 8 | `src/app/api/entities/resolve/route.ts` | 1 | complexity 122 — highest complexity in set |

Suggested split targets (create, don’t inflate):

- **LoopCreatorLayout** → `ui/components/` (toolbar, canvas chrome, panels) + `hooks/useLoopCreatorLayout.ts`
- **generate-tile.task** → `tasks/constants/` + `tasks/lib/tile-pipeline.ts` (poll, persist, notify store)
- **PropertiesPanel** → reuse interior `constants/` + `ui/UI/panels/` per entity kind
- **Sidebar** → `ui/Sidebar/sections/` (assets, generation, fidelity, MJ grid)
- **llm-logger** → `trigger/constants/llm-logger.ts` (existing) + `trigger/utils/llm-logger-extract.ts`

#### Pass 3 — Typing burn-down (~180 errors)

After splits, files are smaller — fix `any` / `!` module by module:

| Module | errs | Focus |
|---|---:|---|
| `world-building-toolkit/state/useWorldUiStore.ts` | 14 | `any` in job metadata / provider config — type against existing wire enums |
| `game-design/agents/*` | 24+ | GameDesignAgent, game-loop-workflow, logic-transformers |
| `3d-asset-exporter/**` | 28 | ThreeDViewer, generate/remesh tasks |
| `loop-creator/core/graph/state.ts` | 5 | `no-dynamic-delete` + graph types |
| `world-building-toolkit/state/client-services/*` | 5+ each | UpscaleService `!`, SelectModeService complexity |
| `app/api/**` | 23 | Route handlers — `API_ERROR` + guards, extract fat POST bodies |

Order within Pass 3: **services → tasks → agents → API routes** (dependencies flow upward).

#### Pass 4 — Hygiene (optional, same session)

- Dead wire enums if lint-clean: nothing left in Agent B set from CustomEvent migration
- `npm run qualitygate:tracker -- --skip-tsc` on touched files only

### Agent B verify (when set is clean)

```bash
npx eslint \
  "src/domains/world-building-toolkit/**/*.{ts,tsx}" \
  "src/domains/loop-creator/**/*.{ts,tsx}" \
  "src/domains/game-design/**/*.{ts,tsx}" \
  "src/domains/interior-designer/**/*.{ts,tsx}" \
  "src/domains/3d-asset-exporter/**/*.{ts,tsx}" \
  "src/domains/marketing/**/*.{ts,tsx}" \
  "src/app/api/**/*.{ts,tsx}" \
  "src/app/(workspace)/**/*.{ts,tsx}" \
  "src/trigger/utils/**/*.{ts,tsx}"
# → 0 errors

npm run typecheck    # whole repo must stay 0
npm run test:unit    # 130 green
```

Rescan every 5 fixes: rerun the eslint command above and update this section’s counts.

## Verify (both agents)

Do **not** regress `npm run typecheck` (currently 0) or `npm run test:unit` while fixing lint.

**Agent A** when clean:
```bash
npx eslint "src/domains/storyteller/**/*.{ts,tsx}" "src/shared/**/*.{ts,tsx}" "src/components/**/*.{ts,tsx}" "src/mcp/**/*.{ts,tsx}" "src/db/**/*.{ts,tsx}"
```

**Agent B** — see command block in Agent B section above.

