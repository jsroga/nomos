/**
 * Per-domain blueprint conformance map.
 *
 * Ratchets toward docs/ARCHITECTURE.md module blueprint. Remove legacy folder names
 * from `legacyTopLevel` as each migration wave lands.
 */

export const BLUEPRINT_TOP_LEVEL = new Set([
  'index.ts',
  'ui',
  'state',
  'core',
  // Zod schemas + mappers per aggregate; the only place snake_case lives.
  'contracts',
  'services',
  'ai',
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
   * ai/ files must import `@/shared/data/server-guard` (ARCHITECTURE §4
   * server-only layer; the guard, not the `server-only` package — that one
   * throws under the node default condition and would crash Mastra Studio,
   * evals, and vitest). Ratchet: flip to true per domain as its ai/ tree
   * is audited (loop-creator still carries a legacy LangChain market-analyst
   * tree — guard it when that is migrated or deleted).
   */
  aiGuardEnforced?: boolean
  /**
   * ui/ PascalCase components must live under components/ when hooks/utils/constants
   * exist at the same level. Ratchet: enable per domain after migration.
   */
  uiLayerStructureEnforced?: boolean
  /**
   * ai/ Mastra agent packages must live under ai/agents/ when constants/tools/workflows
   * exist at the same level. Ratchet: enable per domain after migration.
   */
  aiLayerStructureEnforced?: boolean
}

export const DOMAIN_CONFORMANCE: Record<string, DomainConformance> = {
  storyteller: {
    requiresIndex: true,
    legacyTopLevel: [],
    requiredFolders: ['ui', 'state', 'core', 'services', 'ai'],
    optionalFolders: ['tasks', 'config', '__tests__'],
    servicesServerOnlyOptional: true,
    aiGuardEnforced: true,
    aiLayerStructureEnforced: true,
  },
  '3d-canvas': {
    requiresIndex: true,
    legacyTopLevel: [],
    requiredFolders: ['ui', 'state', 'core', 'services', 'tasks'],
    optionalFolders: ['prompts', 'config', '__tests__'],
  },
  '2d-canvas': {
    requiresIndex: true,
    legacyTopLevel: [],
    requiredFolders: ['ui', 'state', 'core', 'services'],
    optionalFolders: ['tasks', 'config', '__tests__'],
    uiLayerStructureEnforced: true,
  },
  // chat moved to src/shared/chat (PLAN-V2 3.1) — platform module, not a domain.
  'loop-creator': {
    requiresIndex: true,
    legacyTopLevel: [],
    requiredFolders: ['ui', 'state', 'core', 'ai'],
    optionalFolders: ['prompts', '__tests__'],
    uiLayerStructureEnforced: true,
    aiLayerStructureEnforced: true,
  },
  marketing: {
    requiresIndex: true,
    legacyTopLevel: ['legal'],
    requiredFolders: ['ui', 'state'],
    optionalFolders: ['core'],
    uiLayerStructureEnforced: true,
  },
  // deduction-puzzle-designer deleted (user-confirmed, PLAN-V2 6.2)
  '3d-asset-exporter': {
    requiresIndex: true,
    legacyTopLevel: [],
    requiredFolders: ['ui', 'state', 'core', 'tasks'],
    optionalFolders: ['services'],
  },
  'game-design': {
    requiresIndex: true,
    legacyTopLevel: [],
    requiredFolders: ['ai', 'core'],
    optionalFolders: ['prompts', 'services'],
    aiLayerStructureEnforced: true,
  },
}
