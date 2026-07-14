/**
 * Per-domain blueprint conformance map.
 *
 * Ratchets toward docs/unified/ARCHITECTURE.md §4. Remove legacy folder names
 * from `legacyTopLevel` as each migration wave lands.
 */

export const BLUEPRINT_TOP_LEVEL = new Set([
  'index.ts',
  'ui',
  'state',
  'io',
  'core',
  'services',
  'agents',
  'tasks',
  'prompts',
  '__tests__',
  'config',
  // Domain-level string-artifact tables (no-magic-string convention dirs)
  'constants',
  // 'db' removed — the duplicate storyteller schema was deleted (PLAN-V2 6.1);
  // the one Drizzle schema lives at src/db/schema.ts
])

export type DomainConformance = {
  /** Must have a public barrel */
  requiresIndex: boolean
  /** Legacy top-level folders still allowed during migration */
  legacyTopLevel: string[]
  /** Required blueprint folders once migration completes */
  requiredFolders: string[]
  /** Optional blueprint folders for this module type */
  optionalFolders: string[]
  /** Skip server-only enforcement on services/ (legacy modules) */
  servicesServerOnlyOptional?: boolean
  /** Allow React imports in core/ (legacy shared UI types) */
  coreAllowsReact?: boolean
  /**
   * agents/ files must import `@/shared/data/server-guard` (ARCHITECTURE §4
   * server-only layer; the guard, not the `server-only` package — that one
   * throws under the node default condition and would crash Mastra Studio,
   * evals, and vitest). Ratchet: flip to true per domain as its agents/ tree
   * is audited (loop-creator still carries a legacy LangChain market-analyst
   * tree — guard it when that is migrated or deleted).
   */
  agentsGuardEnforced?: boolean
}

export const DOMAIN_CONFORMANCE: Record<string, DomainConformance> = {
  storyteller: {
    requiresIndex: true,
    legacyTopLevel: [],
    requiredFolders: ['ui', 'state', 'io', 'core', 'services', 'agents', 'prompts'],
    optionalFolders: ['tasks', 'config', '__tests__'],
    servicesServerOnlyOptional: true,
    agentsGuardEnforced: true,
  },
  'interior-designer': {
    requiresIndex: true,
    legacyTopLevel: [],
    requiredFolders: ['ui', 'state', 'io', 'core', 'services', 'tasks'],
    optionalFolders: ['prompts', '__tests__'],
  },
  'world-building-toolkit': {
    requiresIndex: true,
    legacyTopLevel: [],
    requiredFolders: ['ui', 'state', 'io', 'core', 'services'],
    optionalFolders: ['tasks', '__tests__'],
  },
  // chat moved to src/shared/chat (PLAN-V2 3.1) — platform module, not a domain.
  'loop-creator': {
    requiresIndex: true,
    legacyTopLevel: [],
    requiredFolders: ['ui', 'state', 'core', 'agents'],
    optionalFolders: ['io', 'prompts', '__tests__'],
  },
  marketing: {
    requiresIndex: true,
    legacyTopLevel: ['legal'],
    requiredFolders: ['ui', 'state'],
    optionalFolders: ['core'],
  },
  // deduction-puzzle-designer deleted (user-confirmed, PLAN-V2 6.2)
  '3d-asset-exporter': {
    requiresIndex: true,
    legacyTopLevel: [],
    requiredFolders: ['ui', 'state', 'io', 'tasks'],
    optionalFolders: ['core', 'services'],
  },
  'game-design': {
    requiresIndex: true,
    legacyTopLevel: [],
    requiredFolders: ['agents', 'core'],
    optionalFolders: ['prompts', 'services'],
  },
}
