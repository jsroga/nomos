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
| **Mentions** (`@entity`) | ◐ | Converter `toMentionCategories` (✅ unit-tested) + `useAssistantMentions` hook (loads providers → `unstable_useMentionAdapter`). Remaining: wire the `@`-trigger popover into the Thread composer + plumb providers/projectContext from consumers. |
| **Action approvals** (`onApproveAllActions`, `ActionComponent`) | ◐ | `AssistantToolFallback` renders Approve/Deny on `status.type === 'requires-action'` → Mastra native `respondToApproval` resume. Needs a Mastra tool to opt into `requireApproval` + live verify. |
| **HITL agent questions** | ⬜ | assistant-ui `humanTool` / `hitl` (a client tool the agent invokes to ask the user); today `onQuestionAnswer/Skip` + `QuestionComponent`. |
| Quick actions / suggestions | ◐ | `ThreadPrimitive.Suggestion` starter prompts in the empty state — per-module (`CanvasModuleDef.chatSuggestions`, loop-creator) or per-surface (`AssistantChat suggestions`, writers-room). Phase-adaptive `SmartQuickActions` logic not ported. |
| Streaming sections / delegation / agent-log | ◐ | Tool-call activity (name · args · result) now rendered in the Thread via `AssistantToolFallback` (tools.Fallback). Dedicated section/delegation parts still todo. |
| Citations | ⬜ | Source message-part component. |
| Persistence (thread history) | ⬜ | assistant-ui `ThreadHistoryAdapter` → `src/shared/data/chat-persistence.ts`. |

## Loop-creator crew (orchestration via assistant-ui)

The loop-creator sidebar today streams the single `loopCreatorSupervisor` agent. The real feature is `streamLoopCreator` (imperative supervisor → specialist crew).

| Step | Status |
|---|---|
| Crew bridge route (`/api/loop-creator/assistant`) running `streamLoopCreator` as an AI-SDK UI-message stream | ◐ built (forwards Message events as text) |
| `CanvasModuleDef.chatApiPath` override so `AssistantChat` targets the crew route + `body:{projectId}` | ◐ wired |
| Build `LoopCreatorState` from `{ messages, projectId, loopId }` (fetch loops/context) | ⬜ (best-effort minimal today — latest user turn only, no DB hydration) |
| Map crew `StreamEvent`s → tool/data parts (agent activity, sections) | ⬜ |

## Cleanup (Track B5)

| Step | Status |
|---|---|
| Delete unused old-chat components once all consumers swapped (`ChatInterface`, streaming UI, `LoopChatInterfaceExtras`, `MentionsChatInterface`, …) | ⬜ |
| Keep pure helpers reused by adapters (mention catalogs, entity providers) | — |

---

**Verification gate:** every `◐` needs a live run (app + OpenRouter key + network) before it becomes ✅. Built compile-clean (TSC 0 / ESLint 0) but UI/stream behavior is unverified from the dev sandbox.
