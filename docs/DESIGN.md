# Product UI design

Shared visual contract for marketing-adjacent workspace surfaces in this product
language: indigo accent, three type faces, hairline panels. Implementation lives
in code; this doc is the contract agents and humans match when editing those
screens.

## Tokens

| Role | Value | Use |
|---|---|---|
| Page background | `hsl(240 10% 3.9%)` | Root surfaces |
| Foreground | `hsl(0 0% 98%)` | Primary text |
| Muted | `rgba(255,255,255,.22)`–`.55` | Metadata, placeholders, idle icons |
| Indigo (interface) | `hsl(235 88% 65%)` | Focus rings, hovers, active chrome, user chat bubble |
| Indigo bright | `hsl(235 92% 68%)` | Marketing hero CTA + chat **send** only |
| Primary fill (app) | `bg-primary` / `hover:bg-primary/90` | Workspace primary buttons (e.g. projects Create); outline→fill chips (Suggest idea, Add to world) |
| Hairline | `rgba(255,255,255,.07)`–`.12` | Borders |
| Panel fill | `rgba(0,0,0,.4)` | Cards |

One accent for interaction. Entity-type colour inside chat cards is the only
extra palette (character blue, location green, faction purple, item/quest amber —
`/.12` fill, `/.28` border).

## Type

| Face | Job |
|---|---|
| JetBrains Mono | Titles, entity names, badges, status, keyboard hints, small control labels |
| Inter | Body copy, message content, inputs |
| Syne (800, uppercase) | Marketing hero / landing primary CTAs only — **not** workspace Create, **not** chat |

## Chrome (app + landing alignment)

Top bars match marketing nav geometry:

- Height `64px` (`h-16`)
- `border-b border-white/[0.06]`, `bg-[rgba(9,9,11,0.92)]`
- Inner (marketing + `/projects`): `max-w-[1280px] mx-auto px-6`
- Workspace (`GlobalHeader`): same height / border / fill, `px-6` (full column width beside sidebar)
- Logo: `/logo.png` at `132px` wide on marketing + `/projects` (no invert filter)
- Sidebar mark: `/sidebar-mark.png` (ALPHA 99) in `GlobalSidebar` icon slot

Code: `LandingNav`, `ProjectSelectionTopBar`, `GlobalHeader`.

## Marketing SSR

`{ ssr: false }` on marketing is allowed **only** for non-text FX (WebGL /
canvas / Three). Text and content must SSR. Rule: `.cursor/rules/marketing-ssr.mdc`.

## Projects dashboard (`/projects`)

Full-width workspace (not a narrow rail + empty hero).

| Piece | Contract |
|---|---|
| Shell | Sticky top bar (above) + body `max-w-[1280px] px-6` |
| Header | Mono “Projects” + count badge; search + sort |
| Compose | Dashed indigo bar: label + inset input + **primary** Create (`bg-primary`, sans medium — not Syne CTA) |
| Grid | Month headers + `repeat(auto-fill, minmax(248px, 1fr))` in **one** continuous grid (headers span full width) |
| Card | `136px` tall: folder icon, mono name, `dd.mm.yy` date; indigo hover lift |

Code: `src/shared/workspace/ui/ProjectSelection*.tsx`,
`src/app/(workspace)/projects/page.tsx`.

Tailwind must scan `src/shared/**` (`tailwind.config.js` content) or these
utilities never emit.

## Assistant chat (`AssistantThread`)

Dockable / full-height chat: **no header** inside the thread chrome.

| Piece | Contract |
|---|---|
| Root | `container-type: inline-size`; flex column; `height: 100%`; overflow hidden |
| Thread | `flex: 1; min-height: 0; overflow-y: auto`; column `max-width: min(680px, 94cqi)` |
| Ambient | Fixed top indigo wash `300px`, `pointer-events: none` |
| User | Right-aligned indigo bubble, radius `14px 14px 3px 14px` |
| Assistant | Avatar + unboxed prose; entity lists → cards; icon actions (copy / regenerate) + **Add to world** (like / attach / `@` hidden for now) |
| Add to world | Same outline primary chip as **Suggest idea**: `Button` `size="sm"` `variant="outline"` · `h-6 text-xs gap-1 border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground` · 12px icon. On Writers Room it **commits** into the inferred bible section (overview / inspirations / soundtrack) immediately — Accept, not Pending Review. Tool-driven `update_world_bible` still uses Accept/Reject on the target section. |
| Model picker | Composer dropdown: **Kimi K3** · **GLM 5.2** · **Opus 5** (`USER_SELECTABLE_CHAT_MODELS`); persists `localStorage` `storyteller-chat-model`; sent as `modelName` on each `/api/assistant/*` request |
| Thinking | **One** replaceable row (dots + mono label), vertically centered with avatar — never stack status strings |
| Composer | Surface with `:focus-within` indigo ring; chips from last reply; model picker; send = indigo bright square + arrow-up (stop while running) |

Sizes that breathe use `clamp(..., Ncqi, ...)` — see
`src/shared/chat/assistant/assistant-thread.css`.

Code: `src/shared/chat/assistant/AssistantThread*.tsx`,
`src/shared/chat/core/constants/assistant-thread-ui.ts`.

## Auth callback

OAuth `?code=` on `/` is forwarded to `/auth/callback` in `src/proxy.ts` (Supabase
Site URL fallback). Redirect allowlist should include
`http://localhost:3000/auth/callback`.
