# assistant-ui Swap Tracker

Live status of replacing the bespoke `@/shared/chat` with **assistant-ui**. Companion to `PLATFORM-ROADMAP.md` Track B/C. Updated as work lands.

Status: ✅ done · ◐ partial (compiles, needs live verify / feature re-home) · ⬜ todo.

---

## Consumer swaps

| Surface | Status | Notes |
|---|---|---|
| `/assistant` multi-agent tester | ✅ | Switch any module's agent via `?module=`. |
| loop-creator `LoopChatSidebar` | ◐ | On `AssistantChat moduleKey="loop-creator"` → **full crew** via `/api/loop-creator/assistant` (streamLoopCreator), `projectId` forwarded in the request body. Activity bar/quick actions dropped. |
| storyteller **writers-room** (`StorytellerWritersRoom`) | ◐ | On `AssistantChat agentId="storyteller"` (the chat-adapter agent — a faithful single agent with the same 10 tools). Rich extras dropped/pending (see feature parity). |
| storyteller CorkBoard / CharacterWeb chat triggers | ⬜ | Use the same `storyteller` agent; wire when those canvases get an inline chat. |

## Feature parity (per @/shared/chat feature → assistant-ui)

| Feature | Status | Plan |
|---|---|---|
| Text streaming + markdown | ✅ | `AssistantThread` (react-markdown + gfm). |
| Reasoning / thinking | ◐ | Reasoning message-part rendered; the old "StreamingTerminal" token view is dropped. |
| Stop / regenerate / copy | ✅ | Composer `Cancel`/`Send`, ActionBar `Reload`/`Copy`. |
| **Model picker** (per-request override) | ▲ superseded | Models are now admin-configured (`model_settings` / `getConfiguredModel`); `handleChatStream` has no clean per-request model override. Revisit only if per-thread model choice is wanted. |
| **Mentions** (`@entity`) | ◐ | Full popover wired: `Unstable_TriggerPopover` + converter + `useAssistantMentions`; writers-room & loop-creator pass their providers. Needs live verify that `@` triggers+inserts. |
| **Action approvals** (`onApproveAllActions`, `ActionComponent`) | ◐ | `AssistantToolFallback` renders Approve/Deny on `status.type === 'requires-action'` → Mastra native `respondToApproval` resume. Needs a Mastra tool to opt into `requireApproval` + live verify. |
| **HITL agent questions** | ⬜ | assistant-ui `humanTool` / `hitl` (a client tool the agent invokes to ask the user); today `onQuestionAnswer/Skip` + `QuestionComponent`. |
| Quick actions / suggestions | ◐ | `ThreadPrimitive.Suggestion` starter prompts in the empty state — per-module (`CanvasModuleDef.chatSuggestions`, loop-creator) or per-surface (`AssistantChat suggestions`, writers-room). Phase-adaptive `SmartQuickActions` logic not ported. |
| Streaming sections / delegation / agent-log | ◐ | Tool-call activity (name · args · result) now rendered in the Thread via `AssistantToolFallback` (tools.Fallback). Dedicated section/delegation parts still todo. |
| Citations | ◐ | `SourceCitation` (Source message-part) renders url/title links in the Thread. Fires only when an agent emits AI-SDK source parts (web-search etc.) — storyteller/loop agents don't today. |
| Persistence (thread history) | ⬜ | assistant-ui `ThreadHistoryAdapter` → `src/shared/data/chat-persistence.ts`. |

## Loop-creator crew (orchestration via assistant-ui)

The loop-creator sidebar today streams the single `loopCreatorSupervisor` agent. The real feature is `streamLoopCreator` (imperative supervisor → specialist crew).

| Step | Status |
|---|---|
| Crew bridge route (`/api/loop-creator/assistant`) running `streamLoopCreator` as an AI-SDK UI-message stream | ◐ built (forwards Message events as text) |
| `CanvasModuleDef.chatApiPath` override so `AssistantChat` targets the crew route + `body:{projectId}` | ◐ wired |
| Build `LoopCreatorState` from `{ messages, projectId, loopId }` (fetch loops/context) | ◐ | Auth + project-access enforced; full conversation hydrated from the assistant-ui `messages` history (not just the last turn); optional `context` (canvas nodes/edges + game meta) seeds the graph when the client sends it. |
| Map crew `StreamEvent`s → tool/data parts (agent activity, sections) | ◐ | Crew activity (which specialist is working `▸`, actions `↳`) streamed on the **reasoning channel** (already rendered by `AssistantThread`); specialist replies on the text channel. Richer tool/data parts still todo. |

## Cleanup (Track B5)

| Step | Status |
|---|---|
| Delete unused old-chat components once all consumers swapped (`ChatInterface`, streaming UI, `LoopChatInterfaceExtras`, `MentionsChatInterface`, …) | ⬜ |
| Keep pure helpers reused by adapters (mention catalogs, entity providers) | — |

---

**Verification gate:** every `◐` needs a live run (app + OpenRouter key + network) before it becomes ✅. Built compile-clean (TSC 0 / ESLint 0) but UI/stream behavior is unverified from the dev sandbox.

## Why the remaining ⬜ are paused (need a live run first)

The safe, self-contained ⬜ items are done (suggestions, tool-call rendering, approval scaffolding, mention converter+hook). The rest are **higher-risk and unverifiable from the sandbox** — building them blind would likely ship broken or break existing behavior:

- **Mention popover wiring** — needs a deep all-`unstable_` composition (`ComposerPrimitive.Unstable_TriggerPopoverRoot` + `TriggerPopover` + `Categories`/`Items`/`Directive`) plus provider/projectContext plumbing from consumers. High chance of a broken popover I can't detect.
- **`requireApproval` opt-in** — Mastra supports it, but the target tools (`manageBeat`, …) are **shared** with the old chat path, which can't handle Mastra approval → gating could hang/break beat deletion app-wide.
- **HITL agent questions** — needs a `humanTool` the agent invokes (server + client) + a tool UI.
- **Persistence** — a `ThreadHistoryAdapter` over `chat-persistence` / Supabase (stateful, needs verification).

**Next action = one live run.** Pull, VPN off, open `/assistant?module=loop-creator`, `?module=storyteller-corkboard`, and the swapped sidebars. If they stream, these ⬜ items unblock with confidence; if not, that fix comes first.
