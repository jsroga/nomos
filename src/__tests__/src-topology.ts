/**
 * Target repo layout — single source of truth for structure gates.
 *
 * Governing docs:
 * - docs/ARCHITECTURE.md § `src/` topology
 * - docs/unified/ARCHITECTURE.md §3 (repository topology) and §4 (module blueprint)
 *
 * Domain blueprint details live in src/domains/__tests__/domain-conformance.ts.
 */

/** docs/ARCHITECTURE.md § `src/` topology (7 folders) + colocated tests */
export const SRC_TOP_LEVEL_ALLOWED = new Set([
  'app',
  'components',
  'db',
  'domains',
  'mcp',
  'shared',
  'trigger',
  '__tests__',
  'mastra', // CLI shim dir — must contain only index.ts (see structure.test.ts)
])

export const SRC_ROOT_FILES_ALLOWED = new Set([
  'instrumentation.ts',
  'instrumentation-client.ts',
  'middleware.ts',
  'mastra.ts',
])

/** Legacy / duplicate homes — must not exist or grow under src/ (unified §3 migration) */
export const SRC_TOP_LEVEL_FORBIDDEN = new Set([
  'agent-core',
  'docs',
  'documentation',
  'evals',
  'evaluation',
  'e2e',
  'hooks',
  'infrastructure',
  'lib',
  'playwright',
  'prompts',
  'scripts',
  'services',
  'store',
  'test',
  'tests',
  'types',
  'utils',
])

/** docs/unified/ARCHITECTURE.md §3 — target shared/ children */
export const SHARED_TOP_LEVEL_TARGET = new Set([
  'agent-kernel',
  'auth',
  'data',
  'errors',
  'jobs',
  'observability',
])

/** Present during P1 migration — no new siblings until absorbed into target */
export const SHARED_TOP_LEVEL_LEGACY = new Set(['ai', 'tours', 'types'])

export const SHARED_TOP_LEVEL_FORBIDDEN = new Set([
  'components',
  'hooks',
  'lib',
  'store',
  'utils',
])

export const SINGLE_HOME_AT_REPO_ROOT = new Set(['docs', 'e2e', 'evals'])
