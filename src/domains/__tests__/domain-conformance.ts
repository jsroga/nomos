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
  'db', // storyteller interim until D-1
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
}

export const DOMAIN_CONFORMANCE: Record<string, DomainConformance> = {
  storyteller: {
    requiresIndex: true,
    legacyTopLevel: [],
    requiredFolders: ['ui', 'state', 'io', 'core', 'services', 'agents', 'prompts'],
    optionalFolders: ['tasks', 'config', 'db', '__tests__'],
    servicesServerOnlyOptional: true,
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
  chat: {
    requiresIndex: true,
    legacyTopLevel: [],
    requiredFolders: ['ui', 'state', 'core'],
    optionalFolders: ['io', '__tests__'],
    coreAllowsReact: true,
  },
  'loop-creator': {
    requiresIndex: true,
    legacyTopLevel: [],
    requiredFolders: ['ui', 'state', 'core', 'agents'],
    optionalFolders: ['io', 'prompts', '__tests__'],
  },
  marketing: {
    requiresIndex: true,
    legacyTopLevel: [],
    requiredFolders: ['ui', 'state'],
    optionalFolders: [],
  },
  'deduction-puzzle-designer': {
    requiresIndex: true,
    legacyTopLevel: [],
    requiredFolders: ['ui', 'state'],
    optionalFolders: ['core', 'io'],
  },
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
