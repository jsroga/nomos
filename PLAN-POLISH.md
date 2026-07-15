# Polishing Plan — lint backlog + Mastra feature adoption

Two workstreams remain after typecheck→0 (`dcf660b`) and the PascalCase→kebab-case file rename. Written for independent agents; disjoint file sets so no two agents touch the same file.

> **Commit discipline (learned the hard way):** land work in small commits per lane. Uncommitted sweeps got reset twice. After each ~10 clean files: `git add <those files> && git commit` (do **not** `git add -A` while another agent is mid-refactor — it recaptures their broken WIP and regresses typecheck-0).

---

## Workstream 1 — ESLint backlog (Agent A scope: `storyteller` + `shared/{chat,agent-kernel,ai,data,auth,observability}` + `components` + `mcp` + `db`)

Current: **212 simple + 30 complexity-strict + 4 max-lines-strict**. Baseline command:
```bash
npx eslint "src/domains/storyteller/**/*.{ts,tsx}" "src/shared/**/*.{ts,tsx}" "src/components/**/*.{ts,tsx}" "src/mcp/**/*.{ts,tsx}" "src/db/**/*.{ts,tsx}"
```

### Simple (212) — by rule, with the fix pattern
| count | rule | fix |
|---:|---|---|
| 157 | `local/no-magic-string` | Extract to a SCREAMING module const, an `enum`, or a `constants/` module. `constants/`, `*-wire.ts`, `enums.ts`, `*-schema.ts`, `*-scorer.ts`, domain `prompts/`, `agents/tools/*-tools.ts`, `mcp/domains/*/tools.ts`, and test files are **exempt** — put the literal there. Comparison/typeof literals and JSX are allowed. |
| 20 | `local/no-repeated-array-filter` | Two `.filter()` on the same array in one scope → **single pass**: one `.reduce()` that partitions, or compute both predicates in one loop. |
| 13 | `no-explicit-any` | Real type / generic / `unknown` + guards from `@/shared/data/json-guards` (`recordFromJson`, `readString`, `readNumber`, `stringArrayFromJson`). **Never `any`.** For loose API JSON, define a small interface (`interface XResponse { …; [key: string]: unknown }`). |
| 7 | `no-non-null-assertion` | Guard + early return / `?? fallback` / `?.`. Map get-or-create: `const v = m.get(k) ?? new Set(); v.add(x); m.set(k, v)`. `getContext('2d')!` → guard-throw with a const. `process.env.X!` → `?? ''` (fails loud at use) or a validated helper. |
| 5 | `no-restricted-imports` | **Boundary** — `shared/**` and cross-domain must not import `@/domains/*`. Move the shared type/store to `@/shared` (e.g. `Tile`, `useWorldStore`). Do **not** paper over with a re-export "seam" — the rule still fires. |
| 5 | `consistent-type-assertions` | Drop `as`. Provide the generic explicitly (`fn<T>(...)`), narrow with a guard, or type the target. |
| 4 | `semi` | `eslint --fix`. |
| 1 | `prefer-literal-enum-member` | Enum member referencing another enum/const → convert the whole enum to `const X = { … } as const` (+ `type X = (typeof X)[keyof typeof X]` if used as a type). Same fix for `no-duplicate-enum-values`. |

### Complexity-strict (30, >25) — extract-helper / table-driven
- **Table-driven** big if-chains → `Record` lookup keyed by a template literal (did `inferRelationshipType` 30→~4). Files: relationship/section mappers.
- **Sub-component extraction** for React render arrows (WorldBible `BibleOverview` 74 / `BibleWorldLogic` 37 / `BibleRoadmap` 38, `EpisodePremisePanel` 79, `EpisodeRoadmapCard` 53, `ReferenceText` 36/35, `WorldBiblePanel` 36): pull each repeated card/list/section into its own `FC`. Match the `onChange` prop type to the callback exactly (`(key: 'books'|'movies'|'games', v: string)`), or TS2322 on contravariance.
- **Logic helpers** for services/tools (`bibleToPrompt` 60, `autoLinkEntities` 58, `assembleStorytellerContext` 53, `buildCrossDomainContext` 34, `assemble*` 30/39, agent tools `character-tools` 77 / `beat-tools` 55 / `episode-tools` 40, `useStorytellerActions` 34, `generate-moodboard` arrow 51, `TourProvider` 29, `applyForceLayout` 26).

### Max-lines-strict (4, >800) — file splits (one extract per `qualitygate:file`)
- `shared/chat/ui/AgentLog.tsx` (1194) → split entry renderers (`ToolEntry`, `ActionEntry`, `ThinkingEntry`, `QuestionEntry`) into `ui/agent-log/`.
- `shared/chat/state/useChatStream.ts` (1068) → extract SSE frame handlers into `state/chat-frame-handlers.ts` (the arrow at ~638 is complexity 102 — split by frame type).
- `storyteller/ui/CharacterCreationDialog` (835), `CharacterWeb` (824) → extract form sections / the force-layout + node-build helpers.

### Cadence (binding)
`npm run qualitygate:file -- <path>` after each file; whole-repo `npm run typecheck` must stay **0** (watch for cascades when widening shared types); rescan every 5 files.

---

## Workstream 2 — Mastra feature adoption (deferred from PLAN-V2; owner: storyteller agents)

Use the **`mastra-workflow`** skill (createStep, parallel critics, suspend/resume HITL, SSE bridge) before touching orchestration. Docs to follow: `mastra.ai/docs/long-running-agents/signals`, `mastra.ai/docs/agent-controller/overview`, `mastra.ai/docs/workspace/skills`.

### 2A. Long-running signals for HITL (`/docs/long-running-agents/signals`)
The beat-draft workflow currently suspends at the editorial verdict and resumes via the SSE `Questions` frame + `workflow/resume` route. Migrate the approve/revise/kill gate to **Mastra signals** so the suspension is a first-class long-running signal (durable, resumable days later, typed payload) instead of the questions-frame overload. Keep the frozen SSE wire contract (`ChatFrameType`) — signals are the backend mechanism; the frame vocabulary the UI sees is unchanged.

### 2B. AgentController plan-first mode (`/docs/agent-controller/overview`)
ADR `docs/adr/agent-controller-chat.md` is **ACCEPTED** (auto-return to chat / always-ask approval / build-only workflow tool). Implement PLAN-V2 phase 4.2–4.4: chat runs in a `plan` mode (read-only tools + `submit_plan`), transitions to `build` via the mode gate; plan approval rides the existing `Questions` frame. Flag `STORYTELLER_CONTROLLER=1`. This forces the agent to plan before mutating (the user's "force the agent to plan first" requirement).

### 2C. Workspace skills (`/docs/workspace/skills`)
Storyteller skills live under `src/domains/storyteller/prompts/skills` (loaded via `agent-kernel/skills`). Align them to the Mastra **workspace skills** convention so the Studio/runtime load them the documented way; verify `getWorkspace()` wiring in `MastraInstance`. Keep `.agents/skills` (Cursor/Claude/Fabro symlinks) in sync.

### Order
Signals (2A) unblocks a cleaner controller (2B); skills (2C) is independent. Do 2A → 2B, 2C in parallel. Each change: run `npm run eval` (no scorer may regress below `evals/results/latest.json`) + `npm run test:unit` + `mastra:build`.
