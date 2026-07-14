# ADR: AgentController as the storyteller chat runtime (PLAN-V2 Phase 4)

**Status:** ACCEPTED (user sign-off 2026-07-13) — 4.2/4.3 implementation unblocked.
**Date:** 2026-07-13 · **Decision scope:** mutations-only plan-first (user decision 2026-07-09).
**Resolved questions (2026-07-13):** Q1 auto-return to chat mode after each completed mutation; Q2 always ask for plan approval initially (auto-approve allowlist later, data-driven); Q3 `run_beat_draft_workflow` is build-mode-only (its verdict gate is the second, inner control).

## Context

The storyteller chat runs on a per-request `StorytellerAgent.stream()` inside the
SSE route. `@mastra/core/agent-controller` is installed and unused. It provides
exactly what PLAN-V2 points 4/5 ask for: durable sessions, **modes with per-mode
tool allowlists**, and a **native plan→build gate** — when the model calls
`submit_plan` in a mode with a `transitionsTo` target and the plan is approved,
the session flips to the target mode idempotently (types:
`node_modules/@mastra/core/dist/agent-controller/{types,session}.d.ts`; docs:
mastra.ai/docs/agent-controller/{overview,session,modes,tool-approvals}.md).

## Decision (proposed)

One `AgentController` for the storyteller chat, adopted **behind a flag**
(`STORYTELLER_CONTROLLER=1`), with the legacy path untouched as default.

### Topology

| Piece | Choice | Why |
|---|---|---|
| Controller | `id: 'storyteller-chat'`, storage = the EXISTING `getStorageInstance()` Postgres store | Never a second store/instance (AGENTS.md invariant). |
| Session | `createSession({ resourceId: userId, tags: { projectId } })` per user/project; thread per conversation | Tags scope thread restore per project; multi-user isolation is per-session by design. |
| Agent source | Same definitions as PLAN-V2 1.1: `buildChatAdapterPrompt`, `resolveRoleModel('chat')`, the 10 tools | One prompt/model/tool source — no drift. |
| Registration | Controller module lives in `src/domains/storyteller/agents/controller/` (server-guard per Phase 2), registered via the `io/mastra-runtime` seam | shared/ never imports domains. |

### Modes — mutations-only plan-first

```
modes: [
  { id: 'chat',  default: true,  transitionsTo: 'build',
    tools: [read_world_bible, list_beats, list_characters, list_episodes,
            check_continuity, submit_plan] },
  { id: 'build',
    tools: [ALL 10 tools + run_beat_draft_workflow] },
]
```

- Reads are never gated: the default mode answers questions instantly with
  read-only tools. It **physically cannot mutate** — mutating tools are not
  visible to the model at all (allowlist, not prompt begging).
- A mutating request forces the model to `submit_plan` ("I will update the
  bible section X with Y because Z"). Approval flips the session to `build`;
  the mutation executes; the session can drop back via a `plan_reset` or stay
  (see Open Question 2).
- The **editorial verdict stays a workflow suspend** — controller modes gate
  *what the agent may do next*; the beat-draft verdict gates *a decision inside
  a durable run*. They compose; the resume route is untouched.

### SSE mapping (frozen wire contract — `ChatFrameType`)

| Session event | SSE frame |
|---|---|
| run started | `Start` |
| text delta | `Token` |
| reasoning delta | `Thinking` |
| tool call started | `AgentStatus` (+ `SectionLoading` via `detectLoadingSection`) |
| tool result | `ToolResult` (+ verdict gate → `Questions`/`AwaitingInput`, unchanged) |
| `submit_plan` surfaced | `Questions` (plan approval as a question frame — same UI affordance as the verdict; NO new frame type) |
| plan approved / mode flip | `Info` (status text; additive, existing frame) |
| run complete | `Message` + `Action`s + `Complete` (via `finalizeStream` semantics) |
| errors | `Error` (+ `Message`) |

The flagged branch reuses `stream-wire.ts` emitters — byte-identical frames.
The plan-approval ANSWER travels the existing question-answer path (client
already posts answers; handler routes plan-approval answers to
`session.approvePlan()` equivalent rather than workflow resume — keyed by the
question id prefix).

### Memory

The controller owns thread memory (replaces the per-request `Memory` in
`StorytellerAgent`). `lastMessages: 10` semantics preserved via memory config.

### Rollback

Flag off → legacy path (kept fully intact). Delete-legacy only after the flag
has been default-on for a full release cycle and the smoke assertion passes.

## Consequences

- The REPL (4.4) and the web chat share sessions — suspend/resume interop for
  free; `/mode plan|build` is a manual override surface.
- `StorytellerAgent`'s class wrapper shrinks to a legacy shim once the flag is
  default-on (grep-zero → delete, per repo deletion discipline).
- New protocol vocabulary is NOT added — plan approval rides `Questions`.

## Open questions (need user input at sign-off)

1. **Auto-return to chat mode** after a completed mutation, or stay in build
   until the thread ends? (Proposed: auto-return — least surprise.)
2. **Plan approval UX**: silent auto-approve for "small" mutations (single
   bible field) vs always ask? (Proposed: always ask initially; add an
   auto-approve allowlist later, informed by usage.)
3. Should `run_beat_draft_workflow` live in chat mode too (it has its own
   verdict gate) or build-only? (Proposed: build-only — launching the pipeline
   IS a mutation; its verdict gate is a second, inner control.)

## Verification plan (4.3 acceptance)

- SSE byte-compatibility: same golden transcript through both paths (flag
  on/off) → identical frame sequences for a read-only conversation.
- Mutation path: bible-update request in flag-on mode → plan question frame →
  approval → mutation lands → mode returns to chat.
- Verdict interop: `/beat` in REPL, approve in web (same runId).
