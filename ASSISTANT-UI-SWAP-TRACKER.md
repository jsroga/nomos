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
| **Action approvals** (`onApproveAllActions`, `ActionComponent`) | ◐ | `AssistantToolFallback` renders Approve/Deny on `status.type === 'requires-action'` → Mastra native `respondToApproval` resume. **Opt-in live:** `manageBeatApprovalTool` (chat-adapter only) gates destructive `delete` via `requireApproval`; the shared `manageBeatTool` stays un-gated so the legacy path can't hang. Needs live verify of the suspend→approve→resume round-trip. |
| **HITL agent questions** | ◐ | Client UI done: `AskUserToolUI` (`makeAssistantToolUI` toolName `askUser`, standalone) renders the question + options/free-text and returns via `addResult({ answer })`; mounted in `AssistantChat`. **Server binding pending a live run:** decide `askUser` as a Mastra suspend/resume tool vs. an unexecuted client tool forwarded by `handleChatStream` — building it blind risks breaking the agent, so it's deferred to verification. |
| Quick actions / suggestions | ◐ | `ThreadPrimitive.Suggestion` starter prompts in the empty state — per-module (`CanvasModuleDef.chatSuggestions`, loop-creator) or per-surface (`AssistantChat suggestions`, writers-room). Phase-adaptive `SmartQuickActions` logic not ported. |
| Streaming sections / delegation / agent-log | ◐ | Tool-call activity (name · args · result) now rendered in the Thread via `AssistantToolFallback` (tools.Fallback). Dedicated section/delegation parts still todo. |
| Citations | ◐ | `SourceCitation` (Source message-part) renders url/title links in the Thread. Fires only when an agent emits AI-SDK source parts (web-search etc.) — storyteller/loop agents don't today. |
| Persistence (thread history) | ◐ | `createSessionThreadHistoryAdapter` (sessionStorage-backed `ThreadHistoryAdapter`, `withFormat` path for `useChatRuntime`) wired via `AssistantChat persistKey`; writers-room + loop-creator pass a per-project key. Swap the read/write helpers for Supabase to persist across devices. Needs live verify of reload restore. |

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

## Status: all self-contained parity items are built (◐), 2 remain gated

Every parity feature that can be built compile-clean is done and pushed (all ◐):
mentions popover, tool-call rendering, `requireApproval` opt-in (delete-gated, assistant-ui-only), HITL `askUser` UI, persistence (sessionStorage history adapter), citations/reasoning, suggestions, crew bridge (auth + full-history hydration + activity channel). Each is **TSC 0 / ESLint 0** but needs one live run to promote ◐ → ✅.

The only genuinely-remaining ⬜ are gated, not skippable-blind:

- **CorkBoard / CharacterWeb inline chat triggers** — speculative "when those canvases get an inline chat"; the storyteller already chats via the Writers-Room sidebar, so a second inline surface is a product decision, not a mechanical port.
- **B5 — delete legacy `@/shared/chat`** — 28 files still import the barrel, but most pull the **pure mention types/catalogs the new assistant-ui code also depends on** (keep those). Deleting the still-mounted legacy UI (`useStorytellerChat`, `useLoopChat`, streaming components) must wait until the ◐ swaps are **live-verified** — removing the working fallback before then would break running behavior.

**Next action = one live run.** Pull, VPN off, open `/assistant?module=loop-creator`, `?module=storyteller-corkboard`, the Writers-Room + loop-creator sidebars, and `/admin`. If chat streams + admin loads, the ◐ items promote to ✅ and B5 can proceed; the `askUser` server binding (Mastra suspend/resume vs. forwarded client tool) is decided from what the live stream shows.
