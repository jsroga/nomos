# Platform Roadmap — Admin Panel · assistant-ui Chat · Infinite-Canvas Convention

Living plan for three intertwined tracks the product is converging on:

1. **Admin panel** — a real shadcn dashboard (models today; modules, tests, plugins next).
2. **Chat** — replace the bespoke `@/shared/chat` with **assistant-ui** on the Mastra/OpenRouter stack.
3. **Infinite-canvas modules** — bring the canvas features onto the new **Mastra + OpenRouter + assistant-ui + admin-configurable** convention.

The "convention" (already true for storyteller, game-design, loop-creator specialists) = agents on the **central Mastra instance**, all models through the **single OpenRouter key** (`openrouter/auto-beta` default, per-role overridable in the admin panel), chat through **assistant-ui**, and per-module config in the **admin panel** (Supabase-backed).

Status legend: ✅ done · ◐ in progress · ⬜ todo.

---

## Current state (what already exists)

- ✅ OpenRouter single-key routing for every agent/scorer (`toOpenRouterModel` / `toOpenRouterModelId`), verified live.
- ✅ Admin **model settings** — `model_settings` table + RLS + `/api/admin/model-settings` + resolver integration (`getConfiguredModel`) + a first `/admin/models` page (to be folded into the unified dashboard).
- ✅ assistant-ui **foundation** — `@assistant-ui/react` + `@assistant-ui/react-ai-sdk` + `@mastra/ai-sdk`; `/api/assistant/[agentId]` bridge (`handleChatStream`); `AssistantChat`/`AssistantThread`; `/assistant` preview.
- Infinite canvas today: `loop-creator/ui/components/LoopFlowCanvas` (React Flow), `storyteller/ui/CharacterWeb` (React Flow), `storyteller/ui/CorkBoard`, `world-building-toolkit/ui/components/Canvas/WorldCanvas`. Chat on the canvas uses `@/shared/chat` (`LoopChatSidebar`, storyteller writers-room).

---

## Track A — Admin panel (shadcn dashboard)

Goal: one protected `/admin` dashboard (admin-gated by `NEXT_PUBLIC_CENTRAL_USERS`) with sections for Models, Modules, Tests (Playwright), and Plugins. Drop the standalone `/admin/models` sub-page in favor of a section in the dashboard.

### Free React/shadcn tools to bootstrap it

| Tool | Use | License |
|---|---|---|
| **shadcn/ui** (`ui.shadcn.com`) | Base components (button, card, table, dialog, tabs, sidebar, form) | MIT, free |
| **shadcn/ui Blocks** — `sidebar-*`, `dashboard-01` | Copy-paste dashboard shell + sidebar nav | MIT, free |
| **satnaing/shadcn-admin** (GitHub) | Full reference admin (layout, RBAC, tables, command menu) to lift patterns from | MIT, free |
| **TanStack Table** + shadcn `data-table` | Sortable/filterable tables (modules, users, test runs) | MIT, free |
| **Tremor** (`tremor.so`, shadcn-compatible) | KPI cards, charts, dashboards | Apache-2, free |
| **Recharts** (already a dep) | Charts (eval scores, test trends) | MIT, free |
| **dnd-kit** | Drag-drop to arrange modules on the canvas / dashboard | MIT, free |
| **Origin UI** / **Kibo UI** | Extra free shadcn parts (rich inputs, dropzones, kbd) | MIT, free |
| **nuqs** | Type-safe URL state for dashboard filters/tabs | MIT, free |
| **Sonner** (already a dep) | Toasts | MIT, free |
| **cmdk** (via shadcn Command) | ⌘K command palette for admin actions | MIT, free |

Bootstrap: `npx shadcn@latest init` then `npx shadcn@latest add sidebar-01 dashboard-01 data-table card tabs form dialog` — it writes into `src/components/ui/` (keep separate from the existing CVA design system; treat shadcn as the admin toolkit). assistant-ui's Thread is already shadcn-styled, so the admin and chat share a look.

### Phases

**A0 — Dashboard shell** ◐ built (own design-system shell, not shadcn init; admin-gated layout + Models·Modules·Tests·Plugins nav)
- `npx shadcn init` + add the sidebar/dashboard blocks under `src/components/ui/` (admin-only surface; don't disturb `@/components/*` design system).
- `src/app/(workspace)/admin/layout.tsx` — server-side admin gate (`createServerComponentClient` + `isAdminUser`) wrapping a shadcn sidebar shell. One gate for all `/admin/*`.
- Nav sections: Models · Modules · Tests · Plugins.

**A1 — Models section** ◐ built (ModelSettingsAdmin mounted at /admin root; free-text OpenRouter id + test-model button still todo)
- Move `ModelSettingsAdmin` into `/admin` as a section; delete the standalone `/admin/models` route.
- Add a free-text OpenRouter id field (beyond the curated list) + a "test this model" button (calls the smoke path server-side).

**A2 — Modules section** ◐ built (module_settings table+RLS migration, getModuleConfig cache, /api/admin/modules GET/PUT, ModuleSettingsAdmin UI at /admin/modules; dnd-kit placement is a text slot for now; MIGRATION NOT YET APPLIED to hosted DB)
- `module_settings` table (Supabase): `{ module_key, enabled, config jsonb, canvas_slot, updated_by, updated_at }` + RLS (authenticated read, admin write).
- `/api/admin/modules` GET/PUT (admin-gated) + a `getModuleConfig(moduleKey)` cache (mirror `model-settings`).
- UI: TanStack data-table of modules (loop-creator, world-building, storyteller-corkboard, character-web…) with enable toggles + per-module model slot + canvas placement (dnd-kit).

**A3 — Tests / Playwright dashboard** ◐ built (json reporter -> test-results/results.json; /api/admin/tests reads+parses it; /admin/tests KPI cards + per-spec table; parser unit-tested. UI-triggered runs + trend charts still todo)
- Playwright already present (`@playwright/test`, `scripts/run-e2e.ts`). Add the **JSON reporter** (`--reporter=json,html`) writing `test-results/results.json`.
- `/api/admin/tests` reads the latest JSON (+ history) → shadcn data-table + Tremor pass/fail trend charts.
- Trigger runs from the UI via a server action that spawns `npm run test:e2e` (guard behind admin + a queue); stream logs to the panel.
- Consider **Monocart reporter** (free) for richer HTML, embeddable via iframe.

**A4 — Plugins** ◐ built (AdminPlugin manifest + registry seeded from first-party catalog; dashboard nav is plugin-driven; /admin/plugins lists the registry. canvas-node/chat-tool mounts typed, no consumers yet)
- Plugin manifest contract: `{ id, name, mount: 'admin-section' | 'canvas-node' | 'chat-tool', component, configSchema }`.
- A registry (`src/shared/admin/plugins/registry.ts`) that the dashboard + canvas read; plugins register at import (mirror `registerMastraModule`). This is what makes the admin "easy to connect built-in plugins."
- First-party plugins: Playwright dashboard (A3), model-settings (A1), module-setup (A2) — each authored as a plugin so the pattern is proven.

---

## Track B — `@/shared/chat` → assistant-ui

`@/shared/chat` is ~80 files with a custom SSE protocol and rich features (mentions, citations, agent logs, sections, delegation, HITL questions, action approvals, eval mode, quick actions, model selector), consumed by ~40 files across storyteller + loop-creator + API routes. assistant-ui provides the runtime + primitives; the custom features are re-created as assistant-ui components/tools. This is a multi-phase swap, not a drop-in.

### Mapping (old → assistant-ui)

| `@/shared/chat` feature | assistant-ui path |
|---|---|
| `useChatStream` + custom SSE frames | `useChatRuntime(AssistantChatTransport)` + `/api/assistant/[agentId]` (`handleChatStream`, AI-SDK stream) |
| `ChatInterface` shell | `AssistantRuntimeProvider` + `Thread` (primitives) |
| Mentions (`@entity`) | `unstable_useMentionAdapter` / `Unstable_Mention` |
| HITL questions / action approvals | `hitl` / `humanTool` + tool UIs (`makeAssistantToolUI`) |
| Citations, sections, agent logs, delegation | custom message-part components + `makeAssistantToolUI` render for tool parts |
| Model selector | reads admin `model_settings` (per-role) — the picker becomes an admin concern |
| Persistence | assistant-ui thread history adapter → `chat_persistence` / Supabase |

### Phases

**B0 — Foundation** ✅
- Deps + `/api/assistant/[agentId]` bridge + `AssistantChat`/`AssistantThread` + `/assistant` preview.

**B1 — Parity: text + streaming + persistence** ⬜
- Style the Thread to the product (markdown via `react-markdown`, reasoning/thinking, stop/regenerate).
- Wire thread history to the existing persistence (`src/shared/data/chat-persistence.ts`).
- A/B `/assistant` against the storyteller writers-room until the streaming/UX matches.

**B2 — Parity: tools & rich parts** ⬜
- Expose storyteller/loop-creator tools as assistant-ui tool UIs (beat draft verdict = HITL approval; workflow progress = tool part render).
- Port citations, sections, agent-log grouping to message-part components.

**B3 — Parity: mentions** ⬜
- Bridge `getGameEntityProvider` / storyteller + loop-creator mention providers → `unstable_useMentionAdapter`.

**B4 — Swap consumers** ⬜
- Replace `ChatInterface`/`useChatStream` in the storyteller writers-room and loop-creator `LoopChatSidebar` with `AssistantChat`.
- Migrate the ~40 consumer files; keep `@/shared/chat`'s pure helpers (mention catalogs, entity providers) reused by the adapters.

**B5 — Delete legacy** ⬜
- Remove the bespoke SSE `@/shared/chat` UI/state once all consumers are on assistant-ui and verified with keys.

---

## Track C — Infinite-canvas modules onto the convention

The canvas (loop-creator `LoopFlowCanvas`, storyteller `CharacterWeb`/`CorkBoard`, `WorldCanvas`) should be a **module host**: each module's AI runs on Mastra/OpenRouter, chats via assistant-ui, and is enabled/configured from the admin panel (Track A2).

### What to move (per module)

| Module | Move onto convention |
|---|---|
| **loop-creator** (`LoopFlowCanvas`) | Agents already Mastra (flagged `LOOP_CREATOR_MASTRA`) + market-analyst native tools ✅. Remaining: flip flag on & verify (keys), swap `LoopChatSidebar` → assistant-ui (Track B4), expose model slot in admin (A2). |
| **storyteller CharacterWeb / CorkBoard** | Any generation (portraits, beat suggestions, relationship enrichment) → Mastra agents on OpenRouter (most already are); canvas-triggered chat → assistant-ui. |
| **world-building-toolkit `WorldCanvas`** | Stays on Trigger.dev for image/3D generation (correct primitive). If it gains agentic reasoning, add a Mastra agent on-convention; otherwise leave. |

### Phases

**C0 — Module registry** ⬜ (depends on A2)
- Define the module contract `{ key, label, canvasNode?, chatAgentId?, modelRole?, enabledByDefault }` and a `registerCanvasModule()` (mirror `registerMastraModule`).
- `module_settings` (A2) drives enable/placement; the canvas reads it.

**C1 — loop-creator on-convention (reference)** ⬜
- `LOOP_CREATOR_MASTRA=1` by default after a keyed A/B; retire the LangChain fallback branch.
- `LoopChatSidebar` → `AssistantChat` (agent = loop-creator supervisor); model slot from admin.

**C2 — storyteller canvas surfaces** ⬜
- CorkBoard/CharacterWeb generation calls confirmed on Mastra/OpenRouter; canvas chat → assistant-ui.

**C3 — Module marketplace / plugins** ⬜ (depends on A4)
- Canvas modules authored as plugins (A4 contract) so new modules mount without core changes — the long-term "setup modules for infinite canvas" goal.

---

## Suggested execution order

1. **A0 + A1** — dashboard shell + fold Models in (small, unblocks everything visual).
2. **B1** — assistant-ui text/streaming/persistence parity (make `/assistant` genuinely usable).
3. **A2 + C0** — modules section + module registry (enables canvas module setup).
4. **B2–B4** — assistant-ui tool/mention parity + swap the loop-creator & storyteller chats (C1/C2 ride along).
5. **A3** — Playwright dashboard (once the shell + data-table pattern exist).
6. **A4 + C3** — plugin contract; re-author sections/canvas modules as plugins.
7. **B5** — delete legacy `@/shared/chat`.

Every phase: keys-tested where it touches live agents; gate `qualitygate:file` per file, `typecheck` before "done"; no wholesale bulk rewrites (incremental per the refactor rules).
