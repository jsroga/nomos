#!/usr/bin/env node
/**
 * Pre-commit architecture gate — delegates to colocated structure tests.
 * Rules live in scripts/structure-gates/ (src topology, domain blueprint, docs catalog).
 */
import { spawnSync } from 'node:child_process'

const STRUCTURE_TESTS = [
  'src/__tests__/structure.test.ts',
  'src/domains/__tests__/domain-structure.test.ts',
]

function main() {
  console.log('check-architecture: running structure tests…')
  const result = spawnSync(
    'npm',
    ['run', 'test:unit', '--', ...STRUCTURE_TESTS],
    { stdio: 'inherit', env: process.env },
  )
  if (result.status !== 0) {
    console.error(
      '\ncheck-architecture: FAILED\n' +
        'Run: npm run test:unit -- src/__tests__/structure.test.ts src/domains/__tests__/domain-structure.test.ts\n' +
        'Governing docs: docs/ARCHITECTURE.md, docs/MODULES.md\n' +
        'docs/ catalog: scripts/structure-gates/docs-allowlist.mjs (flat 7 files)\n',
    )
    process.exit(result.status ?? 1)
  }
  console.log('check-architecture: pass')
}

main()
