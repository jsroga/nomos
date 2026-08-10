# Product modules

> Paths under `src/domains/<name>/`. Public import: `@/domains/<name>` barrel only.  
> Blueprint: [ARCHITECTURE.md](./ARCHITECTURE.md). Storyteller deep-dive: [STORYTELLER.md](./STORYTELLER.md).

| Module | Kind | What it does |
|--------|------|----------------|
| `storyteller` | AI | Writers’ room — bible, beats, script, critics, media tasks |
| `loop-creator` | AI | Gameplay loop design (Mastra supervisor + specialists) |
| `game-design` | AI | Pattern / design-lab agents (Mastra) |
| `2d-canvas` | Asset | **2D / Infinite Canvas** — procedural tiles, upscale, fidelity (Trigger tasks) |
| `3d-asset-exporter` | Asset | GLB ingest, Meshy/Hyper3D generation, remesh |
| `3d-canvas` | Asset | **3D Canvas** — R3F interiors, terrain, surfaces, props |
| `marketing` | UI | Landing / legal surfaces |
| `chat` | Shared UI | Streaming chat chrome (platformizing toward `@/shared/chat`) |

Legacy / niche: `deduction-puzzle-designer` may still exist in docs history; scaffold new work from the module blueprint, not from old internal blurbs.

## Storyteller

Virtual writers’ room on **Mastra v1**: chat SSE, beat-draft workflow (plan → draft → critics → revise + HITL verdict), World Bible, character graph, moodboard/storyboard/poster Trigger tasks. Flagged **AgentController** path: `FF_STORYTELLER_CONTROLLER=true` — see [STORYTELLER.md](./STORYTELLER.md).

## Loop Creator

AI game-design assistant. Orchestrator in `loop-creator/core/graph/`; agents under `ai/`. Optional Mastra chat: `FF_LOOP_CREATOR_MASTRA=true`.

## 2D Canvas (`2d-canvas`)

Infinite tile canvas (product name **Infinite Canvas**). Tile generation (OpenRouter/Grok, Gemini, LegNext), upscale (Stability / LegNext), fidelity enhance. Workspace route `/{projectId}/2d-canvas`. Client canvas + Trigger tasks under `tasks/`. Server writes via `/api/world` + Drizzle — not privileged browser Supabase writes.

## 3D Asset Exporter

Workspace for GLB/GLTF prep and text/image-to-3D providers. Heavy work in `tasks/`.

## 3D Canvas (`3d-canvas`)

R3F sculpt/paint/place. Workspace route `/{projectId}/3d-canvas`; API under `/api/3d-canvas`. Scene undo is separate from high-frequency heightmaps; Low/Medium/High render-quality presets (adaptive while orbiting/sculpting). Perf HUD when `NEXT_PUBLIC_FF_PERF_DEBUG=true` — [DEVELOPMENT.md](./DEVELOPMENT.md).

## Marketing

Public landing (`/`), CWV-sensitive Three.js icons (viewport-gated, lite GLBs via `npm run marketing:glb-lite`). Perf debug: `NEXT_PUBLIC_FF_PERF_DEBUG=true` — [DEVELOPMENT.md](./DEVELOPMENT.md).

## Shared platform pieces (not domains)

| Area | Location |
|------|----------|
| Mastra kernel | `src/shared/agent-kernel/` |
| Auth | `src/shared/auth/` |
| Data / URL / merge | `src/shared/data/` |
| Observability helpers | `src/shared/observability/` |
| Design system | `src/components/` |
| MCP | `src/mcp/` + [MCP_API.md](./MCP_API.md) |
