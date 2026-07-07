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
            content.includes("import 'server-only'") ||
              content.includes('import "server-only"'),
            `${path.relative(DOMAINS_ROOT, file)} must import server-only`,
          ).toBe(true)
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
