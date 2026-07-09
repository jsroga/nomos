# ESLint import & TypeScript guard reference

Agent-facing summary: `.cursor/rules/eslint-boundaries.mdc` (always applied in Cursor).

## 1. Barrel guard (outsiders → domain)

External code (`src/**` excluding `src/domains/<MODULE>/**`) may import `@/domains/<MODULE>` barrel only — not deep paths (except allowed `*/io/*` seams).

Defined in `eslint.config.js` → `DOMAIN_BARREL_GUARD_PATTERNS`.

## 2. Cross-domain isolation (domain → domain) ✅

Each `src/domains/<name>/**` file gets a generated ESLint block (`domainBoundaryConfigs`) that **errors** on:

```ts
import { x } from '@/domains/<other>'        // forbidden
import { y } from '@/domains/<other>/ui/…'  // forbidden
```

**Fix:** move shared types/UI/utils to `src/shared/` and import `@/shared/...`.

Own-domain imports (`@/domains/<self>/...`) remain allowed.

## 3. Shared layer inversion

`src/shared/**` must not import `@/domains/*` or `@/app/*`.

## 4. Legacy root folders

Domains and app code must not import dissolved roots (`@/lib`, `@/agent-core`, …) — use `@/shared/*` paths. See `DOMAIN_LEGACY_RESTRICTED_PATTERNS` and `GLOBAL_LEGACY_RESTRICTED_PATTERNS` in `eslint.config.js`.

## 5. Type assertions

`@typescript-eslint/consistent-type-assertions: ['error', { assertionStyle: 'never' }]` — no `as Type` / `as any` (`as const` only).

## 6. Magic strings (style preference)

When extracting repeated protocol strings (action types, tool ids, statuses), prefer **TypeScript `enum`** over `as const` object maps. Not a separate ESLint rule yet — enforced via agent rules and code review.

## 7. Deep merge

Single implementation: `@/shared/data/deep-merge`. Do not add per-route or per-tool copies.

## Adding a new domain module

1. Add folder name to `DOMAIN_MODULES` in `eslint.config.js`.
2. Add barrel pattern to `DOMAIN_BARREL_GUARD_PATTERNS` if outsiders will import it.
3. Cross-domain block is generated automatically.

## Verify

```bash
npm run lint
# Cross-domain violations example:
npx eslint src/domains/storyteller/ui/MentionsProvider/MentionsProvider.tsx
```
