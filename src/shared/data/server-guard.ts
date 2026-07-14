/**
 * Runtime server-only guard for domain `agents/` layers (PLAN-V2 2.2).
 *
 * Why not the official `server-only` package: it throws UNCONDITIONALLY under
 * the node default export condition (only the `react-server` condition maps to
 * its empty module) — which would crash Mastra Studio (`mastra dev` is a plain
 * node server), the eval runner (`npm run eval` via tsx), and vitest. This
 * guard fails only where it must: in a browser bundle at load time.
 *
 * Build-time client protection still exists independently: the ESLint layer
 * rules forbid `ui/`/`state/` from importing `agents/`, and the
 * domain-structure test enforces this import's presence in agents/ files.
 *
 * Usage (first import of any non-pure module under `src/domains/<x>/agents/`):
 *
 *   import '@/shared/data/server-guard'
 */

const SERVER_GUARD_ERROR =
  'Server-only module imported in a browser bundle: domain agents/ code must never reach the client. Check ui/state imports.'

if (typeof window !== 'undefined') {
  throw new Error(SERVER_GUARD_ERROR)
}

export {}
