---
name: shadcn
description: Add, use, and customize shadcn/ui components correctly in this repo (Radix + Tailwind + CVA, new-york style)
---

# shadcn/ui

Work with shadcn/ui components. Extra context from the user:

> {{user_input}}

shadcn/ui is **not a dependency you import from** — it copies component source
into the repo, which you then own and edit. This project's config
(`components.json`): style `new-york`, RSC on, TSX, `baseColor: neutral`, CSS
variables, Lucide icons.

## Aliases (from components.json)

| Alias | Path |
| --- | --- |
| `@/components/ui` | shared primitives |
| `@/components` | app components |
| `@/lib` | utils (incl. `cn`) |
| `@/hooks` | hooks |

Import primitives from `@/components/ui/<name>` and use `cn()` from `@/lib/utils`.

## Step 1 — Check before adding

The primitives already vendored live in `src/components/ui/*` (button, input,
dialog, alert-dialog, dropdown-menu, tabs, tooltip, switch, slider, scroll-area,
avatar, card, badge, skeleton, progress, label, icon-button, textarea, …).
**Reuse an existing one before adding anything.**

## Step 2 — Add a new primitive (only if missing)

Use the CLI; it reads `components.json` and writes into `src/components/ui/`:

```bash
npx shadcn@latest add <component>      # e.g. popover, sheet, command
```

If the environment can't run the CLI, add the component manually by creating the
file under `src/components/ui/` following the exact structure of an existing
primitive (Radix import + `cva` variants + `cn()` + `forwardRef` + `displayName`).
Do not hand-write markup that a registry component already provides.

## Step 3 — Use a primitive

```tsx
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

<Button variant="outline" size="sm" onClick={onSave}>Save</Button>
```

- Compose with the `asChild` prop (Radix `Slot`) to render as a link etc.
- Combine classes with `cn(...)`; never string-concat class names.
- Use the existing `variant`/`size` options; if you need a new variant, add it to
  that component's `cva` config rather than overriding with ad-hoc classes.

## Step 4 — Customize correctly

- Edit the component source in `src/components/ui/` — you own these files.
- Extend variants inside the component's `cva(...)` block so usage stays
  declarative and consistent.
- Respect the CSS-variable theme (`baseColor: neutral`, `cssVariables: true`);
  use semantic tokens (`bg-primary`, `text-muted-foreground`, `border-input`),
  not raw hex or arbitrary colors.
- Keep Lucide as the icon set (`iconLibrary: lucide`); import icons from
  `lucide-react`.

## Conventions in this repo

- `variant="default"` uses translucent primary (`bg-primary/20`) — match the
  established look; don't reintroduce solid fills unless intended.
- Icon-only buttons use `size="icon"` and **must** have an `aria-label`.
- Prefer `alert-dialog`/`confirm-dialog` for destructive confirmations.
- Domain components live under `src/domains/*/components`; primitives stay generic
  in `src/components/ui`.

## Accessibility (Radix gives you a lot — don't undo it)

- Radix primitives ship correct roles, focus management, and keyboard handling.
  Don't replace them with `div`s.
- Keep `focus-visible` ring styles; never `outline: none` without a replacement.
- Dialogs/menus manage focus + Escape for you — preserve that behavior.

## Anti-patterns

- Do not `npm install` a shadcn "package" — there isn't one; use the CLI to add
  source, or copy the primitive.
- Do not duplicate a primitive that already exists in `src/components/ui`.
- Do not bypass `cn()` / the theme tokens with hardcoded colors.
- Do not strip Radix behavior to "simplify" a component.

## Adding a variant (the right way)

Extend the component's `cva` config rather than overriding at the call site:

```tsx
// src/components/ui/button.tsx
const buttonVariants = cva('…base…', {
  variants: {
    variant: {
      default: 'bg-primary/20 text-primary hover:bg-primary/30',
      // add here:
      success: 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30',
    },
    size: { /* … */ },
  },
})
```

Then `<Button variant="success" />` works everywhere and stays consistent.

## Quick reference

| Task | How |
| --- | --- |
| Use a primitive | `import { X } from '@/components/ui/x'` |
| Merge classes | `cn(base, conditional && 'x', className)` |
| Render as another element | `<Button asChild><a href=…/></Button>` |
| Add a missing primitive | `npx shadcn@latest add <name>` |
| New look | add a `variant` in the component's `cva` |
| Icon | `import { Star } from 'lucide-react'` |

Deliverable: the component added/used/customized, following the repo's
`new-york` + Radix + CVA + theme-token conventions, with `npm run typecheck` and
`npm run lint` clean.
