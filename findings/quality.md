## Quality review findings

### [High] Chat API silently drops beat persistence failures
- Location: `src/app/api/storyteller/chat/route.ts:9-33`
- Issue: `persistApprovedBeats()` catches per-row insert failures, logs them, and then the route still returns a successful response. If the database insert fails for one or more approved beats, the client is told the workflow succeeded even though the saved beat board is incomplete. That is a real correctness risk because the API response and persisted state can diverge with no error surfaced to the caller.
- Fix: make persistence failures part of the route outcome. At minimum, collect insert failures and return a 5xx or partial-failure response; ideally, use a single transactional write and surface a typed error when persistence does not fully succeed.

### [Medium] Workflow tool reads step outputs through `any` casts
- Location: `src/domains/storyteller/tools/workflow-tools.ts:121-130`
- Issue: the tool pulls `drafting`, `critique`, `psychological_analysis`, `consequence_check`, and `synthesis` outputs via `(… as any)` lookups. This defeats the strict TS boundary at the exact place where workflow step contracts matter most: if a step output shape changes, the code will still compile and only fail at runtime or emit malformed summaries.
- Fix: define a typed result shape for the workflow steps (or helper guards for the known step IDs) and read the fields through those types instead of `any` casts.

### [Medium] Storyteller agent keeps core tool plumbing untyped
- Location: `src/domains/storyteller/agents/StorytellerAgent/StorytellerAgent.ts:60-101` and `:543-557`
- Issue: the agent stores tools in `Record<string, any>`, builds the tool list as `any[]`, and exposes `checkStoryContinuity(beatBoard: any[])`. This makes the central agent boundary unverified even though the rest of the repo treats Mastra tools and story entities as strict contracts. Tool ID collisions, bad tool shapes, or malformed beat boards will bypass compile-time checks and surface late.
- Fix: replace the `any`-typed plumbing with Mastra tool types and domain-specific beat board types; if the tool map must stay dynamic, at least narrow it to `Record<string, ToolLike>` and accept `BeatCard[]` (or the project’s canonical beat type) at the public methods.

### [Low] Storyteller config exposes a mutable snapshot singleton
- Location: `src/domains/storyteller/config/storyteller-config.ts:179-243`
- Issue: `STORYTELLER_CONFIG` is exported as a one-time snapshot, while `getStorytellerConfig()` is the runtime-aware source of truth. The two APIs are easy to mix up, and consumers that read the snapshot will not see runtime overrides applied after module initialization. That is a maintainability trap and can make feature-flag/debug behavior appear flaky.
- Fix: keep the snapshot export only if it is intentionally immutable and documented as such; otherwise prefer a single runtime accessor or rename the constant to make the snapshot semantics explicit.

Verdict: mostly clean but still carrying a few correctness and type-safety regressions in the storyteller API/tooling boundary.
Top correctness risks: silent beat-persistence failure in the chat route, workflow step output casts that can drift from runtime shapes, and untyped agent/tool plumbing that hides malformed inputs until production.
