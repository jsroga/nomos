# 1. Overview

This cleanup is mostly architectural, not a net-new feature. The user-facing goal is to keep the existing storyteller workspace at `/app/[projectId]/storyteller` feeling familiar while its internals move toward the target architecture: the same left navigation, same main writing/planning canvas, same Storybible overlay, and same approval/edit flows, but with more trustworthy loading, error, lock, and long-running generation states once episodes and Bible lock state move to `io/` + TanStack Query and poster/moodboard work moves onto Trigger jobs. The shape of the solution is therefore a **behavior-preserving hardening pass on existing surfaces**, not a redesign.

# 2. User flow

1. The user opens the storyteller route for a project.
2. The workspace loads in place: project shell first, then episode list, cast list, current episode data, and Storybible data resolve independently without blocking the entire screen.
3. If the project has no Storybible yet, the main panel shows the existing empty state with two actions: generate a Storybible or open it to create manually.
4. If the project has a Storybible but no episode is selected, the user sees the current empty/starting guidance and can either select an existing episode or draft the first one with AI.
5. In the left sidebar, the user browses episodes, creates a new episode, renames one inline, or deletes one with confirmation.
6. After selecting an episode, the main panel shows the current phase content (premise / beats / script) and the user can continue editing or request AI help.
7. If the user triggers poster or moodboard generation, the current card stays in place and shows inline progress where the artwork lives, plus lightweight background feedback in the existing status/toast pattern.
8. If the user refreshes or navigates away and back while artwork is generating, the same episode or Storybible section rehydrates into a subscribed progress state instead of silently forgetting the job.
9. The user opens the Storybible panel from the workspace. Storybible content loads by section, not as a single blocking spinner.
10. If the Storybible is locked by another user, the user can read but not edit; the UI explains why actions are disabled.
11. If the AI proposes changes for a Storybible section or other structured content, the user sees the same review-first pattern: inline pending overlay for section-level changes, and the existing approval modal for detailed review.
12. When the user saves, edits, approves, rejects, or triggers generation, feedback appears immediately: controls disable appropriately, inline status is visible in context, and non-blocking success uses toast feedback.
13. If a request fails, the affected panel stays visible, shows an inline error, and offers a clear retry path without forcing a full page refresh.

# 3. Screens & components

## A. Storyteller workspace shell
- **Lives in:** `/app/[projectId]/storyteller` route; existing page remains the parent shell, but imported UI should come from `src/domains/storyteller/ui/*` via the module barrel.
- **Purpose:** Orchestrates the left sidebar, main panel, optional Storybible panel, chat/agent output, and action-review surfaces.
- **Composition:** existing `DomainSidebar`, `Button`, `Tooltip`, `StorytellerEmptyState`, `PhaseNavigator`, `StoryPlanBoard`, `Timeline`, `ScriptEditor`, `WorldBiblePanel`, `ActionApprovalModal`, toast feedback.
- **Props/inputs:** current project, current episode id/title, query hook results, mutation callbacks, ephemeral UI state from `useStorytellerUiStore`, streaming/chat state, section loading state, pending action state.
- **Layout notes:** Preserve the current three-zone mental model: left navigation rail, central work surface, right writers-room rail, plus the existing Storybible overlay that opens over the center work surface. Loading should resolve per zone so the shell appears quickly and individual panels can skeleton independently.

## B. EpisodeManager
- **Lives in:** `src/domains/storyteller/ui/EpisodeManager/`; rendered inside the left `DomainSidebar` on the storyteller route.
- **Purpose:** Browse, create, rename, select, and delete episodes.
- **Composition:** existing `Button`, `Tooltip`, `Dialog`, `Input`, `ConfirmDialog`, optional `Skeleton` rows instead of custom shimmer divs where practical.
- **Props/inputs:** `projectId`, `currentEpisodeId`, `episodes`, `isLoading`, `isError`, `errorMessage`, `onEpisodeChange`, `onCreateEpisode`, `onRenameEpisode`, `onDeleteEpisode`, `onRetry`.
- **Layout notes:** Keep the compact sidebar list pattern. Header row contains section title and add button. Each row keeps sequence number, title, and hover/focus-revealed actions. Error and empty states should live inside the list area, not replace the whole sidebar.

## C. CharacterPanel
- **Lives in:** `src/domains/storyteller/ui/CharacterPanel/`; rendered below episodes in the left sidebar.
- **Purpose:** Show cast context and allow create/update/delete flows without leaving the workspace.
- **Composition:** existing `Button`, `Tooltip`, `ConfirmDialog`, `CharacterCreationDialog`, existing card/list rows, optional `Skeleton` placeholders.
- **Props/inputs:** `characters`, `isLoading`, `isError`, `errorMessage`, `selectedBeatId`, `episodeId`, create/update/delete callbacks, retry callback if character query fails.
- **Layout notes:** Preserve current sidebar stacking and dense scanability. Loading and error messages should appear within the cast section only.

## D. StorytellerEmptyState
- **Lives in:** `src/domains/storyteller/ui/StorytellerEmptyState/`; rendered in the main panel when there is no meaningful active working surface yet.
- **Purpose:** Guide first-use setup without forcing the user to guess the next step.
- **Composition:** existing `Button` primitives and Lucide icons (`Film`, `BookOpen`, `FilePlus`, `Sparkles`).
- **Props/inputs:** `hasBible`, `hasEpisodes`, `firstEpisodeId`, `isSending`, action callbacks for generate/open/select.
- **Layout notes:** Preserve the current centered hero treatment. Only the primary CTA should look visually primary; secondary actions stay outline.

## E. StoryPlanBoard + EpisodePremisePanel
- **Lives in:** `src/domains/storyteller/ui/StoryPlanBoard/` and `src/domains/storyteller/ui/EpisodePremisePanel/`; rendered in the main panel for premise/breaking work.
- **Purpose:** Let the user generate, review, edit, and approve the episode premise before moving to beats.
- **Composition:** existing `Button`, `Skeleton`, `StorytellerImage`, `ImageVariantSelector`, `ReferenceText`, phase navigation, inline section generation actions.
- **Props/inputs:** story plan / premise data, loading state, generation state, generating section id, poster/storyboard state, poster job status (`idle | queued | running | succeeded | failed` + optional percentage/message), update callback, generate callbacks, approve callback.
- **Layout notes:** Keep the main content area scrollable and content-first. Section-level regenerate actions should remain near each editable field rather than moving to a global toolbar. Poster progress belongs inside the poster card, not in a separate modal or detached status view.

## F. WorldBiblePanel
- **Lives in:** `src/domains/storyteller/ui/WorldBiblePanel/`; rendered as the full-height overlay over the center storyteller workspace when the Storybible is open.
- **Purpose:** Read and edit Storybible content, view relationships, manage lock status, and review AI-proposed section changes.
- **Composition:** existing panel chrome, `Button`, `Tooltip`, existing content/relationships toggle pattern, `Skeleton`, `CharacterWeb`, Bible section components, `SectionPendingOverlay`.
- **Props/inputs:** Storybible data, per-section loading map, lock state, current user permission state, update/save/cancel callbacks, section mutation callbacks, pending section action map, retry callbacks for data/lock refresh, close callback.
- **Layout notes:** Preserve the current split between content and relationships. Header stays action-oriented: lock status, edit/save/cancel, close. Section loading, pending review, and read-only state must appear inline per section so the user understands exactly what is blocked.

## G. BibleOverview
- **Lives in:** `src/domains/storyteller/ui/WorldBible/BibleOverview/` (or equivalent co-located folder under `ui/WorldBible/`); rendered inside `WorldBiblePanel` content mode.
- **Purpose:** Show the top-level Storybible overview and moodboard, including long-running moodboard generation progress.
- **Composition:** existing `IconButton`, `StorytellerImage`, `Button`, `ConfirmDialog`, `RichText`, `Progress`, `Skeleton`, `SectionPendingOverlay`, Lucide icons.
- **Props/inputs:** overview text, moodboard image list, `primaryImageIndex`, `onSetPrimaryImage`, `onRefetchMoodboardData`, `isReadOnly`, `isEditing`, section loading state, pending action, moodboard job state (`idle | queued | running | succeeded | failed` + optional percentage/message), provider-availability state.
- **Layout notes:** Keep the current stack: overview section first, moodboard section second. Moodboard progress stays inline above the grid and inside any actively generating tile/add-tile card. Do not create a separate “jobs” page or drawer for this flow.

## H. SectionPendingOverlay
- **Lives in:** `src/domains/storyteller/ui/WorldBible/SectionPendingOverlay.tsx` (or equivalent co-located folder under `ui/WorldBible/`).
- **Purpose:** Pause a single Storybible section for accept/reject/review before changes are applied.
- **Composition:** existing `Button` variants with Lucide `Check`, `X`, `Eye`, `Loader2`.
- **Props/inputs:** pending action object, `isProcessing`, callbacks for accept/reject/review.
- **Layout notes:** Overlay only the affected section, not the whole panel. Background blur is acceptable; underlying content should remain partially visible for context.

## I. ActionApprovalModal
- **Lives in:** `src/domains/storyteller/ui/ActionApprovalModal/`; rendered from the workspace shell.
- **Purpose:** Let users inspect higher-detail AI-proposed changes before approving or rejecting them.
- **Composition:** existing dialog/modal treatment, `Button`, diff viewer, summary/diff toggle controls, keyboard shortcuts.
- **Props/inputs:** current action, agent name, open state, approve/reject/close callbacks, processing state.
- **Layout notes:** Keep summary first, diff second. The modal should open with title/context visible before the diff body so the user knows what they are approving.

# 4. States

## Storyteller workspace shell
- **Default / idle:** Route shell visible with left sidebar, main panel, and optional Storybible panel. Previously loaded content remains visible while background refetches run.
- **Loading:** Show panel-level skeletons instead of a page-wide blocker. Left sidebar can show episode and cast skeleton rows while the main panel still renders prior content or its own skeleton.
- **Empty:** If no Storybible, show `StorytellerEmptyState` with setup guidance. If Storybible exists but no episode is selected, show the current "select or draft first episode" guidance.
- **Error:** If project-level data fails, show an inline alert area in the main panel: title + one-sentence explanation + `Retry` button. Do not blank the whole route if only one sub-query failed.
- **Success / confirmation:** Use toast for background success (`Storybible saved`, `Episode created`, `Episode deleted`, `Changes applied`). Keep inline success only where it affects local context, such as lock state changing.
- **Disabled / read-only:** Disable only the controls tied to an in-flight mutation or read-only permission state; the rest of the workspace remains usable.

## EpisodeManager
- **Default / idle:** Episode list visible, current episode highlighted, add button enabled.
- **Loading:** Show 3–5 skeleton/list placeholder rows in the list area. Keep header visible so the user knows which section is loading.
- **Empty:** Message in list area: `No episodes yet.` Supporting text: `Create one from scratch or let the AI draft the first episode.` Include `Create episode` button.
- **Error:** Inline message in list area: `Couldn't load episodes.` Secondary line: `Try again.` Include `Retry` button. Do not silently collapse to an empty list.
- **Success / confirmation:**
  - Create: dialog closes, new episode appears in list, toast `Episode created.`
  - Rename: inline save on blur/Enter, toast only on failure; success can stay quiet.
  - Delete: destructive confirm dialog, then remove row and toast `Episode deleted.`
- **Disabled / read-only:**
  - Disable create/rename/delete while their own mutation is in flight.
  - Keep list selection available unless the entire query is unavailable.
  - If route/project id is missing, show section disabled with helper text `Open a project to manage episodes.`

## CharacterPanel
- **Default / idle:** Cast list visible with existing edit/create affordances.
- **Loading:** Show skeleton cards/rows inside the cast section only.
- **Empty:** Message: `No characters yet.` Supporting text: `Add a character to start building the cast.` Include `Add character` button.
- **Error:** Inline message: `Couldn't load characters.` Include `Retry` button.
- **Success / confirmation:** Character create/update reflects immediately; destructive delete uses confirm dialog and toast `Character deleted.`
- **Disabled / read-only:** Disable create/edit/delete controls only during the relevant mutation or if the parent workspace is in a mode that intentionally blocks edits.

## StorytellerEmptyState
- **Default / idle:** Show current guidance and CTA set based on `hasBible` / `hasEpisodes`.
- **Loading:** Primary CTA shows spinner and disabled state while generation is in flight. Secondary CTA remains disabled only if taking it would conflict with the active operation.
- **Empty:** This component is the empty state; no extra empty state inside it.
- **Error:** If generate-first action fails, keep the empty state visible and show toast `Couldn't generate the Storybible. Try again.`
- **Success / confirmation:** On successful Storybible generation, transition to the open Storybible panel state. On successful first-episode draft, transition to the premise screen for that episode.
- **Disabled / read-only:** All CTAs disabled only while the exact setup mutation is in flight.

## StoryPlanBoard / EpisodePremisePanel
- **Default / idle:** Show current premise content, inline regenerate controls, edit affordances, and bottom CTA when the premise is complete.
- **Loading:** Use content-shaped skeletons for the premise body; keep route chrome visible. For section regeneration, disable only the affected section's regenerate button and show `Generating…` inline.
- **Empty:** If no premise exists, show the current centered empty state with primary CTA to generate the premise.
- **Error:**
  - Query load error: inline panel message `Couldn't load this episode plan.` + `Retry`.
  - Generate/update error: keep current content on screen and toast `Couldn't update the premise. Try again.`
  - Poster/storyboard error: keep controls visible and toast `Couldn't generate artwork. Try again.`
- **Success / confirmation:**
  - Section regeneration updates the section in place.
  - Premise approval reveals the next phase and/or navigates exactly as current behavior already does.
  - Background artwork generation uses non-blocking progress and completion feedback.
  - If the poster job reconnects after refresh, the poster card should resume the last known queued/running state instead of flickering back to “No Poster.”
- **Disabled / read-only:**
  - Disable premise editing buttons while save/generate is in flight.
  - Disable `Plan Ready — Proceed to Beats` until required fields are present.
  - If no episode is selected, this surface does not render; the workspace falls back to empty guidance.

## WorldBiblePanel
- **Default / idle:** Header shows title, close action, lock status, and edit/save/cancel actions. Active tab content is readable and scrollable.
- **Loading:**
  - Initial load: show header skeleton + section skeletons inside the panel.
  - Background refetch: keep current content visible and use subtle section-level loading indicators instead of a full panel pulse.
  - Section generation: show the section's pending/loading treatment only on the affected section.
- **Empty:** If the Storybible record exists but specific sections are blank, render empty editable placeholders inside each section rather than hiding the section.
- **Error:**
  - Query load error: inline panel message at top `Couldn't load the Storybible.` + `Retry`.
  - Lock refresh error: non-blocking inline status `Lock status may be out of date.` + `Refresh`.
  - Save error: keep the user in edit mode and show inline error near header actions plus toast `Couldn't save the Storybible. Try again.`
- **Success / confirmation:**
  - Save: toast `Storybible saved.`
  - Lock acquired: inline status updates to `Locked by you`.
  - Lock released: inline status updates to `Unlocked`.
- **Disabled / read-only:**
  - If locked by another user, all edit controls are disabled and helper text explains who holds the lock.
  - If the user lacks edit permission, show read-only state without implying it is a loading problem.
  - While save/lock mutation is in flight, disable only the relevant header actions.

## BibleOverview
- **Default / idle:** Overview text is readable/editable per mode. Moodboard grid shows existing images, primary-image affordance, regenerate/remove controls, and add-image tile when editable.
- **Loading:**
  - World description section load uses the current inline veil/skeleton treatment on that section only.
  - Moodboard job queued/running state shows inline progress text plus `Progress` bar above the grid, and loading treatment inside the specific image tile or add-image tile that is in flight.
  - On refresh during an in-flight job, show a reconnecting/loading-progress state rather than briefly restoring active generate buttons.
- **Empty:**
  - No overview text: keep the existing empty placeholder in the rich-text area.
  - No moodboard images: show the existing dashed empty card with one clear CTA to generate moodboard images.
- **Error:**
  - Missing provider/API configuration: inline toast error, keep controls visible.
  - Failed moodboard start: toast `Couldn't start moodboard generation. Try again.`
  - Failed job after queueing: inline status above the grid changes to an error state with `Retry` action, and the previously generated images stay visible.
- **Success / confirmation:**
  - Starting generation shows non-blocking toast and immediate inline progress state.
  - Finishing generation updates the grid in place and announces completion.
  - Removing an image removes the tile and confirms with toast.
- **Disabled / read-only:**
  - When Storybible is read-only, hide or disable moodboard mutate actions but keep image browsing and primary-image indicator visible.
  - While a moodboard job is running, disable only conflicting moodboard actions for that project; do not freeze unrelated Storybible sections.

## SectionPendingOverlay
- **Default / idle:** Overlay shows `Pending review` with `Reject`, `Review`, and `Accept` actions.
- **Loading:** When accept is in flight, buttons disable and label changes to `Applying changes...` / `Saving...`.
- **Empty:** Not applicable; overlay only renders when a pending action exists.
- **Error:** If accept fails, overlay remains open, processing state resets, and toast says `Couldn't apply changes. Try again.`
- **Success / confirmation:** Overlay disappears from that section once the change is committed or rejected.
- **Disabled / read-only:** If the section is read-only because of a lock/permission, the overlay should not offer accept/reject actions; instead show `Read-only while locked` and a `Review` action only.

## ActionApprovalModal
- **Default / idle:** Summary view opens first, with clear approve/reject actions and optional switch to diff view.
- **Loading:** While approve is in flight, primary button shows spinner and both approval actions disable to prevent duplicate submits.
- **Empty:** If the action has no parsable changes, show a concise fallback message: `No structured changes to preview.` and keep approve/reject available.
- **Error:** If approval fails, keep the modal open, restore actions, and show inline banner `Couldn't apply changes. Try again.`
- **Success / confirmation:** Modal closes on successful approve/reject and the originating context updates immediately.
- **Disabled / read-only:** If the change targets a locked/read-only surface, disable `Approve` and explain why in the footer: `Unlock the Storybible to apply these changes.`

# 5. Copy

## Workspace + generic feedback
- `Retry`
- `Try again`
- `Loading storyteller…`
- `Couldn't load this section.`
- `Changes applied.`
- `Saved.`

## StorytellerEmptyState
- Title, no bible: `Let's build your Storybible first`
- Body, no bible: `Start with the rules, themes, and key characters so the story stays consistent.`
- Primary CTA: `Generate Storybible first`
- Secondary CTA: `Create manually`
- Title, has bible no episode: `Ready to create your first episode?`
- Body, has bible no episode: `Draft the first episode with AI or create one manually from the sidebar.`
- Primary CTA: `AI draft first episode`
- Secondary CTA: `Open Storybible`
- Title, has episodes but no selection: `Select an episode`
- Body, has episodes but no selection: `Choose an episode from the sidebar to continue writing.`
- Tip label: `Tip:`

## EpisodeManager
- Section title: `Episodes`
- Tooltip, add: `Add episode`
- Tooltip, rename: `Rename episode`
- Tooltip, delete: `Delete episode`
- Empty title: `No episodes yet.`
- Empty body: `Create one from scratch or let the AI draft the first episode.`
- Empty CTA: `Create episode`
- Create dialog title: `New episode`
- Create dialog description: `Enter a title for the new episode. You can change this later.`
- Input placeholder: `e.g. The Call to Adventure`
- Primary button: `Create episode`
- Delete confirm title: `Delete episode`
- Delete confirm body: `Delete “{episodeTitle}”? This can't be undone.`
- Success toast: `Episode created.` / `Episode deleted.`
- Error message: `Couldn't load episodes.` / `Couldn't delete the episode. Try again.`

## CharacterPanel
- Section title: `Cast`
- Empty title: `No characters yet.`
- Empty body: `Add a character to start building the cast.`
- Empty CTA: `Add character`
- Error message: `Couldn't load characters.`
- Success toast: `Character saved.` / `Character deleted.`

## StoryPlanBoard / EpisodePremisePanel
- Empty title: `No episode premise`
- Empty body: `Define the hook, flaw, stakes, and consequence for this episode.`
- Primary CTA: `Generate Ozymandias premise`
- Section button while loading: `Generating…`
- Approval CTA: `Plan ready — proceed to beats`
- Error message: `Couldn't load this episode plan.`
- Error toast: `Couldn't update the premise. Try again.`
- Poster queued toast: `Poster generation started.`
- Poster reconnecting label: `Reconnecting to poster generation…`
- Poster error toast: `Couldn't generate artwork. Try again.`

## WorldBiblePanel
- Panel title: `Storybible`
- Lock state, self: `Locked by you`
- Lock state, other: `Locked by {name}`
- Lock state, free: `Unlocked`
- Read-only helper: `Read-only while another editor has the lock.`
- Lock refresh warning: `Lock status may be out of date.`
- Top error: `Couldn't load the Storybible.`
- Save success toast: `Storybible saved.`
- Save error toast: `Couldn't save the Storybible. Try again.`
- Retry action: `Retry`
- Refresh action: `Refresh`

## BibleOverview
- Moodboard empty body: `No mood visuals generated yet.`
- Moodboard primary CTA: `Generate moodboard`
- Add-image tile label: `Add image`
- Queued/running label: `Generating…`
- Reconnecting label: `Reconnecting to moodboard generation…`
- Start toast: `Moodboard generation started.`
- Add-image toast: `Generating new moodboard image…`
- Remove success toast: `Image removed.`
- Missing-config error: `Missing image provider setup. Check Settings and try again.`
- Start error toast: `Couldn't start moodboard generation. Try again.`

## SectionPendingOverlay
- Idle badge: `Pending review`
- Idle body: `New content is ready for approval.`
- Accept: `Accept`
- Reject: `Reject`
- Review: `Review`
- Loading badge: `Applying changes...`
- Loading body: `Please wait while the section is being updated.`
- Error toast: `Couldn't apply changes. Try again.`

## ActionApprovalModal
- Fallback body: `No structured changes to preview.`
- Footer note, locked: `Unlock the Storybible to apply these changes.`
- Error banner: `Couldn't apply changes. Try again.`

# 6. Accessibility

- **Keyboard interaction model**
  - All icon-only controls use real `button` elements with `aria-label` matching the tooltip text.
  - Episode rows should remain keyboard reachable. Enter/Space selects the episode.
  - Inline rename uses a real input. Enter saves, Escape cancels, blur saves only if the content changed and is valid.
  - Dialogs (`New episode`, confirm dialog, action approval modal) use the existing Radix dialog keyboard behavior: Tab/Shift+Tab trap focus, Escape closes unless a mutation is actively in flight.
  - If the summary/diff toggle in `ActionApprovalModal` remains custom, it must behave like a two-option segmented control or tabs, not a bare clickable div.
  - Avoid global keyboard listeners that override standard Tab behavior unless the control is a true composite widget and focus is managed intentionally.

- **Focus management**
  - When the create episode dialog opens, focus moves to the title input.
  - When the dialog closes, focus returns to the trigger button that opened it.
  - When the action approval modal opens, focus lands on the modal title or first actionable control; after close, return focus to the review trigger.
  - If an inline error appears after a failed mutation, move focus to the error region only when the failure closes/removes the original control context; otherwise keep focus on the triggering control and announce via live region.

- **ARIA roles/labels**
  - Current episode row should expose selected state (`aria-current="true"` or `aria-selected="true"` in a listbox-like pattern, depending on final markup).
  - Storybible lock indicator needs a text label, not color alone.
  - Section pending overlays should expose an accessible heading or label so screen-reader users know which section is awaiting review.
  - Loading regions should use `aria-busy="true"` on the affected panel or section.
  - Any visible percent-complete bar for poster/moodboard work should expose `role="progressbar"` with an accessible name like `Moodboard generation progress`.
  - Error summaries should use `role="alert"`; non-blocking status updates should use `aria-live="polite"`.

- **Color contrast and non-color status**
  - Do not rely on glow, border color, or muted opacity alone for lock, error, selected, or pending-review status.
  - Pair color with text and/or icon: e.g. lock icon + `Locked by you`, alert icon + error text, check icon + `Changes applied`.
  - Hover-only action reveal in episode rows must also be available on keyboard focus.

- **Screen-reader announcements**
  - Announce async transitions via a polite live region: `Episodes loaded`, `Storybible saved`, `Changes ready for review`, `Couldn't load episodes`, `Lock acquired`, `Lock released`.
  - For long-running poster/moodboard generation, announce start, reconnect-after-refresh, failure, and completion for the affected surface only.

# 7. Responsive behavior

This route is effectively **desktop-first** and that should remain true for this cleanup. Do **not** spend this increment inventing a new mobile IA. Minimum responsive requirements:

- The workspace must remain usable down to tablet widths without horizontal clipping of dialogs or unreadable controls.
- Left sidebar and Storybible panel remain independently scrollable.
- Dialogs (`New episode`, confirmation, action review) must fit within the viewport on small screens and allow internal scrolling.
- Long episode titles, character names, and Storybible content should truncate or wrap gracefully instead of forcing layout overflow.
- If the existing layout collapses at smaller breakpoints, preserve that behavior; if not, do not add a brand-new drawer pattern in this cleanup.

# 8. Developer handoff notes

1. **No net-new feature UI.** This is a preservation-and-hardening pass while the module moves to `ui/`, `state/`, and `io/`.
2. **Relocate, do not redesign:**
   - `components/EpisodeManager` → `ui/EpisodeManager`
   - `components/CharacterPanel` → `ui/CharacterPanel`
   - `components/StorytellerEmptyState` → `ui/StorytellerEmptyState`
   - `components/StoryPlanBoard` → `ui/StoryPlanBoard`
   - `components/EpisodePremisePanel` → `ui/EpisodePremisePanel`
   - `components/WorldBiblePanel` and `components/WorldBible/*` UI pieces → `ui/WorldBiblePanel` / `ui/WorldBible/*`
   - `components/ActionApprovalModal` → `ui/ActionApprovalModal`
3. **Wire UI to the target data layer from the plan:**
   - Episode list + mutations should read from `state/queries/useEpisodes` and episode detail from `state/queries/useEpisode`.
   - Storybible panel should read from a Storybible query hook and keep only local edit/open/tab state in UI state.
   - Bible open/close state, selected beat, active tab, activity-panel visibility, and other ephemeral toggles belong in `useStorytellerUiStore`, not in server-state query data.
4. **Preserve the existing route layout and mental model.** The route should still feel like storyteller, not like a new tool.
5. **Add missing explicit states while rewiring data:**
    - EpisodeManager currently needs a real empty state and explicit inline error state.
    - CharacterPanel needs an explicit inline error state.
    - WorldBiblePanel needs a top-level query error treatment and lock-refresh warning state.
    - BibleOverview needs a reconnecting/running/error state for moodboard jobs.
    - EpisodePremisePanel needs a reconnecting/running/error state for poster jobs.
    - ActionApprovalModal needs an inline failure state if apply fails.
6. **Prefer shared primitives already in the repo:** `Button`, `Dialog`, `ConfirmDialog`, `Tooltip`, `Input`, `ScrollArea`, `Skeleton`, `Tabs`, `Badge` where useful. Do not invent custom button styles unless an existing variant cannot cover the need.
7. **Easy-to-miss edge cases:**
    - Preserve unsaved local edits during background refetches.
    - Do not flash the whole Storybible panel back to loading during a refetch if existing data is present.
    - Persist only the job identifier needed to resubscribe after refresh; do not recreate the old `localStorage` scan / custom-event UX.
    - Keep hover-revealed episode actions reachable by keyboard focus.
    - Distinguish `empty` from `error` from `locked/read-only`; users should never have to guess which one they are seeing.
    - If a section-level AI action is pending review and the panel refetches, the pending overlay must remain anchored to the correct section.
    - When an item is deleted or selection becomes invalid, move focus to the next sensible target rather than dropping it on `body`.
    - While a poster or moodboard job is in flight, disable only the controls that would create a duplicate run for the same asset; unrelated editing should stay available.
8. **Priority order for implementation:**
    - First preserve layout and existing flows while moving components behind the barrel.
    - Then rewire episodes/Storybible to query hooks with skeleton + error states.
    - Then wire poster/moodboard surfaces to shared job observation with the same visible affordances.
    - Then clean up approval/lock/read-only states and accessibility gaps.
