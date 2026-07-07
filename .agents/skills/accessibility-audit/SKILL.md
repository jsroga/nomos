---
name: accessibility-audit
description: Audit UI components against WCAG and fix keyboard, focus, ARIA, and contrast issues
---

# Accessibility Audit

Audit the UI target below for accessibility. Extra context from the user:

> {{user_input}}

If no target is given, audit the components in the current diff. The bar is
**WCAG 2.1 AA**. Accessibility issues are defects, not nice-to-haves.

## Step 1 — Inventory the surface

- Read the component(s) and identify every interactive element: buttons, links,
  inputs, toggles, sliders, tabs, dialogs, menus, tooltips.
- Note which use semantic HTML vs. `div`/`span` with handlers (the latter are
  the usual source of problems).
- This project uses Radix primitives in places — prefer those, since they bake in
  correct roles, focus, and keyboard behavior.

## Step 2 — Audit against the checklist

### Keyboard

- Every interactive element is reachable and operable by keyboard alone.
- Logical tab order; no keyboard traps.
- Standard keys work: Enter/Space activate, Escape closes overlays, Arrow keys
  move within composites (tabs, menus, radio groups, sliders).
- No `tabIndex` > 0. Use `0` (focusable) or `-1` (programmatically focusable).

### Focus management

- Visible focus indicator on every focusable element — never `outline: none`
  without an equivalent replacement.
- Opening a dialog/menu moves focus into it; closing returns focus to the trigger.
- Focus is trapped inside modal dialogs while open.

### Semantics & ARIA

- Use native elements first (`<button>`, `<a href>`, `<label>`, `<nav>`).
- Non-semantic interactive elements have the correct `role` + keyboard handlers.
- Every control has an accessible name (visible label, `aria-label`, or
  `aria-labelledby`). Icon-only buttons must have a label.
- Form inputs are associated with `<label>`; errors use `aria-describedby` and
  `aria-invalid`.
- State exposed to AT: `aria-expanded`, `aria-selected`, `aria-checked`,
  `aria-disabled`, `aria-current` as appropriate.
- Don't misuse ARIA — a wrong role is worse than none.

### Dynamic content

- Async status changes (loading, success, error) are announced via a live region
  (`aria-live="polite"` / `role="status"` / `role="alert"`).
- Loading states don't leave screen-reader users in silence.

### Visual

- Text contrast ≥ 4.5:1 (≥ 3:1 for large text and UI component boundaries).
- Status is never conveyed by color alone — pair with text or icon.
- Layout survives 200% zoom and respects `prefers-reduced-motion` for animations.

### Media & images

- Meaningful images have `alt`; decorative ones have `alt=""`.

## Step 3 — Report and fix

For each issue: element, the WCAG concern, severity, and the concrete fix.

- **🔴 Blocker** — makes the feature unusable for a group (e.g. control not
  keyboard-operable, no accessible name).
- **🟡 Serious** — significant barrier with a workaround.
- **🟢 Minor** — polish.

If the user asked you to **fix** (not just audit), apply the fixes: prefer
semantic elements and Radix primitives, add the missing labels/roles/handlers,
restore focus styles, and manage focus for overlays. Keep changes minimal and in
the project's style, then run `npm run typecheck` and `npm run lint`.

## Quick before/after examples

Icon-only button missing a name:

```tsx
// Before — screen readers announce nothing useful
<button onClick={toggle}><StarIcon /></button>

// After
<button onClick={toggle} aria-label="Add to favorites" aria-pressed={isFav}>
  <StarIcon aria-hidden="true" />
</button>
```

Clickable div (not keyboard-operable):

```tsx
// Before
<div onClick={open}>Open</div>

// After — use a real button (or add role + key handlers if truly unavoidable)
<button onClick={open}>Open</button>
```

## WCAG AA quick reference

| Concern | Requirement |
| --- | --- |
| Text contrast | ≥ 4.5:1 (≥ 3:1 large text / UI boundaries) |
| Keyboard | All functionality operable without a mouse |
| Focus visible | Always a visible indicator |
| Names | Every control has an accessible name |
| Status | Not conveyed by color alone |
| Motion | Respect `prefers-reduced-motion` |
| Zoom | Usable at 200% |

## When in doubt

Reach for a native element or a Radix primitive before hand-rolling ARIA. Correct
semantics beat clever markup, and a wrong `role` is worse than none.

## Deliverable

Report: the issues found by severity, the fixes applied (or recommended if
audit-only), and any remaining risks worth manual screen-reader testing.
