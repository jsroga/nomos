---
name: component-audit
description: Reconnaissance pass over existing UI components — run BEFORE building or changing any UI so you reuse instead of reinvent
---

# Component Audit

**Run this before you write or modify any UI.** Its purpose is to make sure you
build on what already exists instead of duplicating a button, dialog, or state
pattern that's already in the repo. Extra context from the user:

> {{user_input}}

Output an inventory + a short "how to build this" recommendation. Do **not**
write feature code in this skill — it is a pre-work audit.

## Step 1 — Map the shared UI layer

This project uses **shadcn/ui** (see `components.json`, style `new-york`, Lucide
icons) on top of **Radix** + **Tailwind** + **class-variance-authority**.

- List the shared primitives in `src/components/ui/*` (button, input, dialog,
  alert-dialog, dropdown-menu, tabs, tooltip, switch, slider, scroll-area,
  avatar, card, badge, skeleton, progress, label, icon-button, textarea …).
- Read `src/lib/utils.ts` for the `cn()` helper and note the import aliases from
  `components.json` (`@/components/ui`, `@/lib`, `@/hooks`).
- Note the CVA variant conventions (how `variant`/`size` are structured, e.g. in
  `button.tsx`) so anything new matches.

## Step 2 — Map the domain components

- Identify which domain the work lands in under `src/domains/*/components`
  (`storyteller`, `interior-designer`, `chat`, `game-design`, `loop-creator`).
- Find 2-3 existing components closest to what you need. Record their file paths,
  props, and the states they handle (loading/empty/error/success/disabled).
- Note the folder convention: `ComponentName/ComponentName.tsx` + `index.ts`.

## Step 3 — Assess reuse vs. build

For the thing you're about to build, decide and record:

| Need | Existing match? | Action |
| --- | --- | --- |
| e.g. confirm destructive action | `confirm-dialog.tsx` / `alert-dialog.tsx` | reuse |
| e.g. icon-only toggle | `icon-button.tsx` | reuse + `aria-pressed` |
| e.g. brand-new widget | none found | build in domain, compose primitives |

Only propose a new component when nothing suitable exists — and say what
primitives it should be composed from.

## Step 4 — Flag risks & gaps

- **Duplication:** any place already doing this that you'd be re-implementing.
- **Inconsistency risk:** where your change could drift from the design language.
- **Missing states:** existing components in the area that skip empty/error
  states you'll need.
- **Coupling:** shared components whose props you'd have to change (and every call
  site that would break).
- **Accessibility debt:** primitives missing labels/focus handling you'd inherit.

## Step 5 — Report

Produce a concise audit:

- **Reusable primitives** relevant to the task (with paths).
- **Closest existing components** and what to copy from them.
- **Build recommendation:** what to reuse, what to create, where it goes.
- **Risks** to watch (duplication, coupling, a11y).
- **Open questions** for a human if any decision is ambiguous.

## Guardrails

- Read-only reconnaissance: inspect and report, don't implement.
- Prefer shadcn/ui + Radix primitives over hand-rolled markup every time.
- Never recommend adding a new UI dependency if a primitive already covers it.
- Keep it skimmable — the goal is to save the next step from rediscovering the
  component library.

## Example audit output (shape)

```markdown
### Component Audit — "favorite toggle on project card"

Reusable primitives
- src/components/ui/icon-button.tsx — icon-only button w/ variants
- src/components/ui/tooltip.tsx — for the hover label

Closest existing components
- src/domains/storyteller/components/.../ProjectCard — where the toggle lands;
  already handles loading/error via the project store hook.

Build plan
- Reuse icon-button + tooltip; add `aria-pressed`. No new primitive needed.
- Wire to existing project store action. Handle idle/loading/error states.

Risks
- ProjectCard is shared across 3 screens — verify prop change doesn't break them.
- No empty state needed (defaults to not-favorited).
```

## Fast commands for the audit

- List primitives: glob `src/components/ui/*`.
- Find similar components: grep for the pattern/prop you need across
  `src/domains/*/components`.
- Check a shared component's usages before proposing a prop change: grep its
  import path to find every call site.

Deliverable: the audit report above, ending with a one-line "build plan" the
implementing step can act on immediately.
