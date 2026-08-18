#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { assertOpenApiRouteCoverage } from './route-coverage'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function main(): void {
  if (!assertOpenApiRouteCoverage(repoRoot)) process.exit(1)
  console.log('openapi:coverage OK')
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
