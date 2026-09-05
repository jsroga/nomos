/**
 * Domain folder structure conformance tests.
 *
 * Ratchets each module toward docs/ARCHITECTURE.md module blueprint via
 * scripts/structure-gates/domain-conformance.ts.
 */

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  BLUEPRINT_TOP_LEVEL,
  DOMAIN_CONFORMANCE,
} from '../../../scripts/structure-gates/domain-conformance'
import { findNonTestFilesInTestDirs } from '../../../scripts/structure-gates/test-folder-rules'

const DOMAINS_ROOT = path.resolve(__dirname, '..')

describe('__tests__ folder purity', () => {
  it('contains only *.test.ts / *.test.tsx files under src/domains/', () => {
    const offenders = findNonTestFilesInTestDirs(DOMAINS_ROOT)
    expect(
      offenders,
      `domain __tests__ folders must only contain test files — move helpers to scripts/: ${offenders.join(', ')}`,
    ).toEqual([])
  })
})

/** Blueprint layer folders — PascalCase UI must live under components/ when these exist. */
const UI_LAYER_FOLDERS = new Set([
  'hooks',
  'utils',
  'constants',
  'components',
  'types',
  'panels',
])

function isPascalCaseName(name: string): boolean {
  const base = name.replace(/\.(tsx|ts)$/, '')
  return /^[A-Z]/.test(base)
}

function findUiComponentLayerViolations(uiDir: string, relPrefix = ''): string[] {
  if (!fs.existsSync(uiDir)) return []

  const entries = fs.readdirSync(uiDir, { withFileTypes: true })
  const hasLayerFolder = entries.some((e) => e.isDirectory() && UI_LAYER_FOLDERS.has(e.name))
  if (!hasLayerFolder) return []

  const violations: string[] = []
  for (const entry of entries) {
    const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      if (UI_LAYER_FOLDERS.has(entry.name)) continue
      if (isPascalCaseName(entry.name)) {
        violations.push(`${rel}/`)
      }
      continue
    }
    if (/\.(tsx|ts)$/.test(entry.name) && isPascalCaseName(entry.name)) {
      violations.push(rel)
    }
  }
  return violations
}

function listUiFeatureFolders(uiDir: string): string[] {
  if (!fs.existsSync(uiDir)) return []
  return fs
    .readdirSync(uiDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !UI_LAYER_FOLDERS.has(e.name))
    .map((e) => e.name)
}

/** Blueprint layer folders — agent packages must live under agents/ when these exist. */
const AI_LAYER_FOLDERS = new Set([
  'constants',
  'tools',
  'workflows',
  'agents',
  'prompts',
  'types',
  'controller', // AgentController config (not a Mastra Agent package)
])

function findAiAgentLayerViolations(aiDir: string, relPrefix = ''): string[] {
  if (!fs.existsSync(aiDir)) return []

  const entries = fs.readdirSync(aiDir, { withFileTypes: true })
  const hasLayerFolder = entries.some((e) => e.isDirectory() && AI_LAYER_FOLDERS.has(e.name))
  if (!hasLayerFolder) return []

  const violations: string[] = []
  for (const entry of entries) {
    const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      if (AI_LAYER_FOLDERS.has(entry.name)) continue
      violations.push(`${rel}/`)
      continue
    }
    if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.startsWith('index.')) {
      if (entry.name === 'request-context.ts' || entry.name === 'tracing.ts') continue
      violations.push(rel)
    }
  }
  return violations
}

/**
 * Pure modules under ai/ that stay importable from evals/tests without
 * the server guard: zod schemas, deterministic gate logic, deterministic
 * eval scorers, and pure helpers (no Mastra runtime, no DB).
 */
const PURE_AI_MODULES: Record<string, readonly string[]> = {
  storyteller: [
    'ai/agents/BeatPlanner/beat-plan-schema.ts',
    'ai/agents/BeatPlanner/beat-plan-quality.ts',
    'ai/agents/BeatPlanner/beat-plan-concreteness-scorer.ts',
    'ai/agents/critics/critic-schema.ts',
    'ai/agents/critics/critic-rules.ts',
    'ai/agents/critics/critic-discipline-scorer.ts',
    'ai/request-context.ts',
    'ai/tracing.ts',
    'ai/workflows/beat-draft-contract.ts',
    'ai/workflows/artifact-draft-contract.ts',
    'ai/workflows/fix-inconsistencies-contract.ts',
    'ai/workflows/fix-inconsistencies-schema.ts',
    'ai/workflows/beat-draft-default-deps.ts',
    'ai/workflows/beat-draft-deps-types.ts',
    'ai/agents/Muse/wild-idea-schema.ts',
    'ai/agents/Muse/ranked-idea-schema.ts',
    'ai/prompts/schemas/agent-schemas.ts',
    'ai/prompts/guardrails/anti-slop-phrases.ts',
    'ai/prompts/grrm-system-prompt.ts',
    'ai/prompts/beat-planner-prompt.ts',
    'ai/prompts/chat-adapter-prompt.ts',
    'ai/prompts/types.ts',
    'ai/prompts/registry/prompt-registry-ids.ts',
    'ai/prompts/registry/prompt-registry-table.ts',
    'ai/workflows/artifact-draft-deps-types.ts',
    'ai/tools/beat-tool-operations.ts',
    'ai/tools/beat-tools-schema.ts',
    'ai/tools/character-tool-operations.ts',
    'ai/tools/character-tools-schema.ts',
    'ai/tools/episode-tool-operations.ts',
    'ai/tools/episode-tools-schema.ts',
    'ai/tools/manage-tools-wire.ts',
  ],
}

function isPureAiModule(domain: string, file: string): boolean {
  const rel = path.relative(path.join(DOMAINS_ROOT, domain), file).split(path.sep).join('/')
  return (PURE_AI_MODULES[domain] ?? []).includes(rel)
}

function listTopLevel(domain: string): string[] {
  const domainPath = path.join(DOMAINS_ROOT, domain)
  if (!fs.existsSync(domainPath)) return []
  return fs.readdirSync(domainPath)
}

function walkFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkFiles(full, acc)
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      acc.push(full)
    }
  }
  return acc
}

describe('Domain folder structure conformance', () => {
  for (const [domain, config] of Object.entries(DOMAIN_CONFORMANCE)) {
    describe(domain, () => {
      it('has index.ts public barrel when required', () => {
        if (!config.requiresIndex) return
        expect(fs.existsSync(path.join(DOMAINS_ROOT, domain, 'index.ts'))).toBe(true)
      })

      it('top-level entries are blueprint or documented legacy exceptions', () => {
        const topLevel = listTopLevel(domain)
        const configFile = `${domain}.config.ts`
        const allowed = new Set([
          ...BLUEPRINT_TOP_LEVEL,
          ...config.legacyTopLevel,
          configFile,
          'server.ts',
        ])

        for (const entry of topLevel) {
          if (entry === '__tests__') continue
          expect(
            allowed.has(entry),
            `${domain}/${entry} is not in blueprint or legacy exceptions`,
          ).toBe(true)
        }
      })

      it('has required blueprint folders once legacy exceptions are cleared', () => {
        if (config.legacyTopLevel.length > 0) return
        const topLevel = listTopLevel(domain)
        for (const folder of config.requiredFolders) {
          expect(
            topLevel.includes(folder),
            `${domain} missing required folder: ${folder}`,
          ).toBe(true)
        }
      })

      it('has no top-level io/ folder (network layer lives under core/io/)', () => {
        expect(
          fs.existsSync(path.join(DOMAINS_ROOT, domain, 'io')),
          `${domain}/io must not exist at domain root — move to core/io/`,
        ).toBe(false)
      })

      it('services/ files use server-only when present', () => {
        if (config.servicesServerOnlyOptional) return
        const servicesDir = path.join(DOMAINS_ROOT, domain, 'services')
        if (!fs.existsSync(servicesDir)) return

        const files = walkFiles(servicesDir).filter(
          (f) =>
            !f.includes('__tests__') &&
            !f.endsWith('.test.ts') &&
            !f.includes('client-services') &&
            !f.endsWith(`${path.sep}index.ts`),
        )

        for (const file of files) {
          const content = fs.readFileSync(file, 'utf8')
          expect(
            content.includes('import \'server-only\'') ||
              content.includes('import "server-only"'),
            `${path.relative(DOMAINS_ROOT, file)} must import server-only`,
          ).toBe(true)
        }
      })

      it('ai/ files import the server guard (server-only layer)', () => {
        if (!config.aiGuardEnforced) return // ratchet — see domain-conformance.ts
        const aiDir = path.join(DOMAINS_ROOT, domain, 'ai')
        if (!fs.existsSync(aiDir)) return

        const files = walkFiles(aiDir).filter(
          (f) =>
            !f.includes('__tests__') &&
            !f.endsWith('.test.ts') &&
            // constants/ dirs hold pure string-artifact tables by convention
            !f.split(path.sep).includes('constants') &&
            // prompts/schemas/ — pure Zod contracts (no Mastra runtime)
            !f.split(path.sep).includes('schemas') &&
            !isPureAiModule(domain, f),
        )

        for (const file of files) {
          const content = fs.readFileSync(file, 'utf8')
          expect(
            content.includes('import \'@/shared/data/server-guard\'') ||
              content.includes('import "@/shared/data/server-guard"'),
            `${path.relative(DOMAINS_ROOT, file)} must import @/shared/data/server-guard ` +
              '(ai/ is server-only — see ARCHITECTURE §4; the official server-only ' +
              'package is not usable here: it throws under the node default condition, ' +
              'crashing Mastra Studio, evals, and vitest)',
          ).toBe(true)
        }
      })

      it('ai/ files do not import ui/ or state/ layers', () => {
        const aiDir = path.join(DOMAINS_ROOT, domain, 'ai')
        if (!fs.existsSync(aiDir)) return

        const forbidden = [
          new RegExp(`from ['"]@/domains/${domain}/ui`),
          new RegExp(`from ['"]@/domains/${domain}/state`),
          /from ['"]\.\.\/(\.\.\/)*ui\//,
          /from ['"]\.\.\/(\.\.\/)*state\//,
        ]

        for (const file of walkFiles(aiDir)) {
          const content = fs.readFileSync(file, 'utf8')
          for (const pattern of forbidden) {
            expect(
              pattern.test(content),
              `${path.relative(DOMAINS_ROOT, file)} violates the layer rule (ai/ may not import ui/ or state/): ${pattern}`,
            ).toBe(false)
          }
        }
      })

      it('ai/ agent packages live under agents/ when layer folders exist', () => {
        if (!config.aiLayerStructureEnforced) return
        const aiDir = path.join(DOMAINS_ROOT, domain, 'ai')
        if (!fs.existsSync(aiDir)) return

        const violations = findAiAgentLayerViolations(aiDir)
        expect(
          violations,
          `${domain}/ai: move Mastra agent packages into ai/agents/ — found beside constants/tools/workflows: ${violations.join(', ')}`,
        ).toEqual([])
      })

      it('ui/ PascalCase components live under components/ when layer folders exist', () => {
        if (!config.uiLayerStructureEnforced) return
        const uiDir = path.join(DOMAINS_ROOT, domain, 'ui')
        if (!fs.existsSync(uiDir)) return

        const violations = [
          ...findUiComponentLayerViolations(uiDir),
          ...listUiFeatureFolders(uiDir).flatMap((feature) =>
            findUiComponentLayerViolations(path.join(uiDir, feature), feature),
          ),
        ]

        expect(
          violations,
          `${domain}/ui: move PascalCase components into components/ — found at ui root beside hooks/utils/constants: ${violations.join(', ')}`,
        ).toEqual([])
      })

      it('core/ files do not import react or db', () => {
        if (config.coreAllowsReact) {
          // still forbid db imports in core
        }
        const coreDir = path.join(DOMAINS_ROOT, domain, 'core')
        if (!fs.existsSync(coreDir)) return

        const forbidden = config.coreAllowsReact
          ? [/@\/db/, /from ['"]@\/db/]
          : [
              /from ['"]react['"]/,
              /from ['"]react\//,
              /@\/db/,
              /from ['"]@\/db/,
            ]

        for (const file of walkFiles(coreDir)) {
          if (file.includes(`${path.sep}core${path.sep}io${path.sep}`)) continue
          const content = fs.readFileSync(file, 'utf8')
          for (const pattern of forbidden) {
            expect(
              pattern.test(content),
              `${path.relative(DOMAINS_ROOT, file)} violates core purity: ${pattern}`,
            ).toBe(false)
          }
        }
      })
    })
  }
})
