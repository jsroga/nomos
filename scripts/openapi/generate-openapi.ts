#!/usr/bin/env node
/**
 * Generate public/openapi.json from Zod registries.
 * Usage:
 *   npx tsx scripts/openapi/generate-openapi.ts
 *   npx tsx scripts/openapi/generate-openapi.ts --check
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPublicOpenApiDocument } from './build-document'

enum OpenApiGenerateArg {
  Check = '--check',
}

enum OpenApiGeneratePath {
  SpecRelative = 'public/openapi.json',
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const specPath = path.join(repoRoot, OpenApiGeneratePath.SpecRelative)

function serializeDocument(doc: unknown): string {
  return `${JSON.stringify(doc, null, 2)}\n`
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

function main(): void {
  const checkOnly = process.argv.includes(OpenApiGenerateArg.Check)
  const document = buildPublicOpenApiDocument()
  const next = serializeDocument(document)

  if (checkOnly) {
    if (!existsSync(specPath)) {
      console.error(`openapi:check failed — missing ${OpenApiGeneratePath.SpecRelative}`)
      console.error('Run: npm run openapi:generate')
      process.exit(1)
    }
    const current = readFileSync(specPath, 'utf8')
    if (hashContent(current) !== hashContent(next)) {
      console.error('openapi:check failed — public/openapi.json is out of date')
      console.error('Run: npm run openapi:generate')
      process.exit(1)
    }
    console.log('openapi:check OK')
    return
  }

  writeFileSync(specPath, next, 'utf8')
  const pathCount = Object.keys(document.paths ?? {}).length
  console.log(`Wrote ${OpenApiGeneratePath.SpecRelative} (${pathCount} paths)`)
}

main()
