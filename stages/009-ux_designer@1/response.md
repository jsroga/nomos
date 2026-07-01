Wrote `UX.md` at the repo root.

Key handoff points:
- This is a **backend-heavy architecture cleanup**, so the UX spec keeps storyteller’s existing layout and mental model intact: left sidebar, center workspace, right writers-room rail, and the **Storybible overlay** on top of the center workspace.
- The spec focuses on the real user-visible risk areas from the plan:
  1. **Episodes** moving to TanStack/`io/` with explicit loading, empty, and error states.
  2. **Storybible lock state** becoming reliable and clearly communicated.
  3. **Poster + moodboard generation** moving to Trigger jobs with inline progress, reconnect-after-refresh behavior, and no regression to forgotten jobs.
- I called out the exact surfaces to preserve or harden:
  - `EpisodeManager`
  - `StorytellerEmptyState`
  - `StoryPlanBoard` / `EpisodePremisePanel`
  - `WorldBiblePanel`
  - `BibleOverview`
  - `SectionPendingOverlay`
  - `ActionApprovalModal`
- The spec includes:
  - concrete user flow
  - component composition using existing primitives (`Button`, `Dialog`, `ConfirmDialog`, `Tooltip`, `Skeleton`, `Progress`, etc.)
  - exhaustive states for each interactive surface
  - exact copy for errors, toasts, labels, and progress/reconnect states
  - accessibility guidance for keyboarding, live regions, and progressbars
  - responsive constraints
  - a developer checklist with migration priorities and easy-to-miss edge cases

Most important implementation notes:
- **No redesign.**
- **No new jobs UI surface**; keep progress inline where the artwork already appears.
- **Resubscribe after refresh** for poster/moodboard jobs instead of the old localStorage-scan/custom-event behavior.
- **Disable only conflicting controls**, not whole panels, during long-running work.