/**
 * Domain folder structure conformance tests.
 *
 * Ratchets each module toward docs/unified/ARCHITECTURE.md §4 via
 * src/domains/__tests__/domain-conformance.ts.
 */

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  BLUEPRINT_TOP_LEVEL,
  DOMAIN_CONFORMANCE,
} from './domain-conformance'

const DOMAINS_ROOT = path.resolve(__dirname, '..')

/**
 * Pure modules under agents/ that stay importable from evals/tests without
 * the server guard: zod schemas, deterministic gate logic, deterministic
 * eval scorers, and pure helpers (no Mastra runtime, no DB).
 */
const PURE_AGENTS_MODULES: Record<string, readonly string[]> = {
  storyteller: [
    'agents/BeatPlanner/beat-plan-schema.ts',
    'agents/BeatPlanner/beat-plan-quality.ts',
    'agents/BeatPlanner/beat-plan-concreteness-scorer.ts',
    'agents/critics/critic-schema.ts',
    'agents/critics/critic-rules.ts',
    'agents/critics/critic-discipline-scorer.ts',
    'agents/request-context.ts',
    'agents/tracing.ts',
    'agents/workflows/beat-draft-contract.ts',
    'agents/Muse/wild-idea-schema.ts',
    'agents/Muse/ranked-idea-schema.ts',
  ],
}

function isPureAgentsModule(domain: string, file: string): boolean {
  const rel = path.relative(path.join(DOMAINS_ROOT, domain), file).split(path.sep).join('/')
  return (PURE_AGENTS_MODULES[domain] ?? []).includes(rel)
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

      it('agents/ files import the server guard (server-only layer)', () => {
        if (!config.agentsGuardEnforced) return // ratchet — see domain-conformance.ts
        const agentsDir = path.join(DOMAINS_ROOT, domain, 'agents')
        if (!fs.existsSync(agentsDir)) return

        const files = walkFiles(agentsDir).filter(
          (f) =>
            !f.includes('__tests__') &&
            !f.endsWith('.test.ts') &&
            // constants/ dirs hold pure string-artifact tables by convention
            !f.split(path.sep).includes('constants') &&
            !isPureAgentsModule(domain, f),
        )

        for (const file of files) {
          const content = fs.readFileSync(file, 'utf8')
          expect(
            content.includes('import \'@/shared/data/server-guard\'') ||
              content.includes('import "@/shared/data/server-guard"'),
            `${path.relative(DOMAINS_ROOT, file)} must import @/shared/data/server-guard ` +
              '(agents/ is server-only — see ARCHITECTURE §4; the official server-only ' +
              'package is not usable here: it throws under the node default condition, ' +
              'crashing Mastra Studio, evals, and vitest)',
          ).toBe(true)
        }
      })

      it('agents/ files do not import ui/ or state/ layers', () => {
        const agentsDir = path.join(DOMAINS_ROOT, domain, 'agents')
        if (!fs.existsSync(agentsDir)) return

        const forbidden = [
          new RegExp(`from ['"]@/domains/${domain}/ui`),
          new RegExp(`from ['"]@/domains/${domain}/state`),
          /from ['"]\.\.\/(\.\.\/)*ui\//,
          /from ['"]\.\.\/(\.\.\/)*state\//,
        ]

        for (const file of walkFiles(agentsDir)) {
          const content = fs.readFileSync(file, 'utf8')
          for (const pattern of forbidden) {
            expect(
              pattern.test(content),
              `${path.relative(DOMAINS_ROOT, file)} violates the layer rule (agents/ may not import ui/ or state/): ${pattern}`,
            ).toBe(false)
          }
        }
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
