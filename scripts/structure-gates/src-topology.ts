/**
 * Target repo layout — single source of truth for structure gates.
 *
 * Governing docs:
 * - docs/ARCHITECTURE.md § `src/` topology
 * - docs/ARCHITECTURE.md (repository topology + module blueprint)
 *
 * Domain blueprint details live in scripts/structure-gates/domain-conformance.ts.
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
  'trigger-dark-factory', // opt-in Cursor SDK task (esbuild-external); not in default TRIGGER_DIRS
  '__tests__',
  'mastra', // Studio entry + file-based agent prompts (see structure.test.ts)
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

/**
 * docs/ARCHITECTURE.md — approved shared/ children.
 * Anything else under src/shared/ fails check-architecture / structure.test.
 */
export const SHARED_TOP_LEVEL_TARGET = new Set([
  'admin', // platform admin UI + plugins
  'agent-kernel',
  'auth',
  'canvas', // workspace module registry / settings
  'chat', // chat platform (moved from src/domains/chat — PLAN-V2 3.1 / D7)
  'data',
  'debug', // client perf overlays (CWV HUD, React Scan)
  'errors',
  'jobs',
  'observability',
])

/** Present during P1 migration — no new siblings until absorbed into target */
export const SHARED_TOP_LEVEL_LEGACY = new Set(['ai', 'tours', 'types', 'three', 'workspace'])

/** Parallel bucket folders — never under src/shared/ (even as “temporary”) */
export const SHARED_TOP_LEVEL_FORBIDDEN = new Set([
  'components',
  'constants',
  'helpers',
  'hooks',
  'lib',
  'providers',
  'services',
  'state',
  'store',
  'ui',
  'utils',
])

export const SINGLE_HOME_AT_REPO_ROOT = new Set(['docs', 'e2e', 'evals'])

export {
  DOCS_ALLOWED_FILES,
  DOCS_FORBIDDEN_DIR_NAMES,
  DOCS_IGNORED_ENTRIES,
  isAllowedDocsPath,
} from './docs-allowlist.mjs'