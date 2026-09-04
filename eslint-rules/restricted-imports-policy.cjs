/**
 * One complete `no-restricted-imports` options object per matching block.
 *
 * Flat config replaces a rule's options when a later block matches the same
 * file. Fragments that are not restated in the surviving object are dropped.
 */

const DOMAIN_MODULES = [
  'storyteller',
  '3d-canvas',
  'loop-creator',
  'marketing',
  '3d-asset-exporter',
  'game-design',
  '2d-canvas',
]

const PROVIDER_SDK_MESSAGE =
  'ONLY OpenRouter via @/shared/ai/gateway (complete / completeStructured / embed / meteredCall). ' +
  'Direct openai / Anthropic / Google / other vendor SDKs and spending ai SDK exports are forbidden. ' +
  'Rule: A2 · OpenRouter-only.'

const SPENDING_AI_EXPORTS = [
  'generateText',
  'generateObject',
  'streamText',
  'streamObject',
  'embed',
  'embedMany',
]

const PROVIDER_SDK_RESTRICTED_PATHS = [
  { name: 'ai', importNames: SPENDING_AI_EXPORTS, message: PROVIDER_SDK_MESSAGE },
  { name: 'openai', message: PROVIDER_SDK_MESSAGE },
  { name: 'anthropic', message: PROVIDER_SDK_MESSAGE },
  { name: '@anthropic-ai/sdk', message: PROVIDER_SDK_MESSAGE },
  { name: '@google/generative-ai', message: PROVIDER_SDK_MESSAGE },
  { name: 'cohere-ai', message: PROVIDER_SDK_MESSAGE },
  { name: '@mistralai/mistralai', message: PROVIDER_SDK_MESSAGE },
  { name: 'replicate', message: PROVIDER_SDK_MESSAGE },
]

const PROVIDER_SDK_RESTRICTED_PATTERNS = [
  { group: ['@ai-sdk/*', '!@ai-sdk/react'], message: PROVIDER_SDK_MESSAGE },
  { group: ['@anthropic-ai/*'], message: PROVIDER_SDK_MESSAGE },
  { group: ['@google-cloud/aiplatform', '@google/genai'], message: PROVIDER_SDK_MESSAGE },
]

function domainBarrelGuardGroup(domain, extraAllows) {
  const group = [
    `@/domains/${domain}/*`,
    // gitignore: a matched parent directory also hides children, so un-ignore
    // `core` before `core/io` or the documented seam never fires.
    `!@/domains/${domain}/core`,
    `@/domains/${domain}/core/*`,
    `!@/domains/${domain}/core/io`,
    `!@/domains/${domain}/core/io/**`,
    ...(extraAllows ?? []),
  ]
  return {
    group,
    message: `Import from "@/domains/${domain}" instead of ${domain} internals. Only core/io/ is allowed for deep imports.`,
  }
}

const DOMAIN_BARREL_GUARD_PATTERNS = [
  domainBarrelGuardGroup('storyteller', [
    '!@/domains/storyteller/server',
    '!@/domains/storyteller/server/**',
  ]),
  domainBarrelGuardGroup('3d-canvas'),
  domainBarrelGuardGroup('2d-canvas'),
  domainBarrelGuardGroup('game-design'),
  domainBarrelGuardGroup('loop-creator', [
    '!@/domains/loop-creator/server',
    '!@/domains/loop-creator/server/**',
  ]),
  {
    group: ['@/domains/chat', '@/domains/chat/*'],
    message: 'chat moved to @/shared/chat (platform module) — import from there.',
  },
  {
    group: ['@/domains/marketing/*'],
    message: 'Import from "@/domains/marketing" instead of marketing internals.',
  },
  {
    group: ['@/domains/3d-asset-exporter/*'],
    message: 'Import from "@/domains/3d-asset-exporter" instead of 3d-asset-exporter internals.',
  },
]

const DOMAIN_LEGACY_RESTRICTED_PATTERNS = [
  {
    group: ['@/lib/*', '@/lib'],
    message: 'Import from "@/shared/data" or "@/shared/auth" instead of @/lib.',
  },
  {
    group: ['@/hooks/*', '@/hooks'],
    message: 'Import from "@/shared/data/queries" or "@/shared/data" instead of root @/hooks.',
  },
  {
    group: ['@/store/*', '@/store'],
    message: 'Import from "@/shared/auth" or "@/shared/errors" instead of root @/store.',
  },
  {
    group: ['@/services/*', '@/services'],
    message: 'Import from "@/shared/data" or domain index instead of root @/services.',
  },
]

const GLOBAL_LEGACY_RESTRICTED_PATTERNS = [
  {
    group: ['@/agent-core/*', '@/agent-core'],
    message: 'Import from "@/shared/agent-kernel" instead of @/agent-core.',
  },
  {
    group: ['@/infrastructure/*', '@/infrastructure'],
    message: 'Import from "@/shared/data" or "@/shared/ai" instead of @/infrastructure.',
  },
  {
    group: ['@/prompts/*', '@/prompts'],
    message: 'Import from "@/shared/agent-kernel/prompts" instead of root @/prompts.',
  },
  {
    group: ['@/lib/*', '@/lib'],
    message: 'Import from "@/shared/data", "@/shared/auth", or "@/shared/tours" instead of @/lib.',
  },
  {
    group: ['@/types/*', '@/types'],
    message: 'Import from "@/shared/types" instead of @/types.',
  },
  {
    group: ['@/config/*', '@/config'],
    message: 'Import from "@/shared/data/constants" instead of @/config.',
  },
  {
    group: ['@/constants/*', '@/constants'],
    message: 'Import from "@/shared/data/constants" instead of @/constants.',
  },
  {
    group: ['@/workflows/*', '@/workflows'],
    message: 'Import from domain agents or "@/shared/agent-kernel/workflows" instead of @/workflows.',
  },
  {
    group: ['@/mastra', '@/mastra/index', '@/mastra/index.ts'],
    message:
      'Do not import the Studio Mastra entry. Import file-based agents from "@/mastra/agents/<id>/…" or helpers from "@/shared/agent-kernel/mastra".',
  },
  {
    group: ['@/evaluation/*', '@/evaluation'],
    message: 'Import from "@/evals" (top-level evals/) instead of @/evaluation.',
  },
]

const PROJECT_ACCESS_PATTERN = {
  group: ['@/shared/auth/project-access'],
  message:
    'Establish project access with projectScope() / tryProjectScope() from ' +
    '@/shared/auth/project-scope. verifyProjectAccess is internal to shared/auth.',
}

const SHARED_NO_DOMAINS_PATTERNS = [
  {
    group: ['@/domains/*', '@/domains'],
    message: 'shared/ MAY NOT import domains — dependency inversion required.',
  },
  {
    group: ['@/app/*', '@/app'],
    message: 'shared/ MAY NOT import app routes — dependency inversion required.',
  },
]

const EDGE_RUNTIME_PATTERNS = [
  {
    group: ['@/db', '@/db/*', 'pg', 'postgres', 'drizzle-orm', 'drizzle-orm/*'],
    message:
      'Edge runtime: the proxy cannot open a database connection. Do the lookup in the route handler.',
  },
  {
    group: ['node:*', 'fs', 'path', 'crypto', 'child_process'],
    message: 'Edge runtime: Node builtins are unavailable in the proxy.',
  },
  {
    group: ['@trigger.dev/*', 'openai', '@ai-sdk/*', '@mastra/*', 'replicate', 'sharp'],
    message: 'Edge runtime: provider and job SDKs are Node-only. Keep the proxy to routing decisions.',
  },
]

function fragment(paths, patterns) {
  return {
    paths: paths ?? [],
    patterns: patterns ?? [],
  }
}

function crossDomain(currentDomain) {
  return fragment(
    [],
    DOMAIN_MODULES.filter(domain => domain !== currentDomain).map(other => ({
      group: [`@/domains/${other}`, `@/domains/${other}/*`],
      message: `Cross-domain import forbidden: use @/shared instead of @/domains/${other}.`,
    })),
  )
}

function legacyRoot() {
  return fragment([], [...DOMAIN_LEGACY_RESTRICTED_PATTERNS, ...GLOBAL_LEGACY_RESTRICTED_PATTERNS])
}

function providerSdk() {
  return fragment(PROVIDER_SDK_RESTRICTED_PATHS, PROVIDER_SDK_RESTRICTED_PATTERNS)
}

function projectAccess() {
  return fragment([], [PROJECT_ACCESS_PATTERN])
}

function sharedNoDomains() {
  return fragment([], SHARED_NO_DOMAINS_PATTERNS)
}

function barrelGuard() {
  return fragment([], DOMAIN_BARREL_GUARD_PATTERNS)
}

function edgeRuntime() {
  return fragment([], EDGE_RUNTIME_PATTERNS)
}

function composeRestrictedImports(...fragments) {
  const paths = []
  const patterns = []
  for (const part of fragments) {
    if (!part) continue
    if (Array.isArray(part.paths) && part.paths.length > 0) paths.push(...part.paths)
    if (Array.isArray(part.patterns) && part.patterns.length > 0) patterns.push(...part.patterns)
  }
  const options = {}
  if (paths.length > 0) options.paths = paths
  if (patterns.length > 0) options.patterns = patterns
  return options
}

function domainFromSourcePath(file) {
  const match = /^src\/domains\/([^/]+)\//.exec(file)
  return match ? match[1] : null
}

function domainRemainderConfigs(remainderFiles) {
  return remainderFiles.map(file => {
    const domain = domainFromSourcePath(file)
    const fragments = [legacyRoot()]
    if (domain) fragments.push(crossDomain(domain))
    return {
      files: [file],
      rules: {
        'no-restricted-imports': ['error', composeRestrictedImports(...fragments)],
      },
    }
  })
}

module.exports = {
  DOMAIN_MODULES,
  PROVIDER_SDK_RESTRICTED_PATHS,
  PROVIDER_SDK_RESTRICTED_PATTERNS,
  composeRestrictedImports,
  crossDomain,
  legacyRoot,
  providerSdk,
  projectAccess,
  sharedNoDomains,
  barrelGuard,
  edgeRuntime,
  domainRemainderConfigs,
  domainFromSourcePath,
}
