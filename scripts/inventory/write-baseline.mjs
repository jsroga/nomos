/**
 * Writes scripts/inventory/baselines/<baseRef>.json from the current tree.
 *
 * Run once when the AST inventory lands. Changing baseRef without regenerating
 * this file fails ratchet-base.test.ts.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { collectIdentities } from './collect.mjs'

const ratchet = JSON.parse(readFileSync('.quality-ratchet.json', 'utf8'))
const baseRef = ratchet.baseRef
if (typeof baseRef !== 'string' || baseRef.length === 0) {
  throw new Error('.quality-ratchet.json is missing baseRef')
}

const outPath = join('scripts/inventory/baselines', `${baseRef}.json`)
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, `${JSON.stringify(collectIdentities(), null, 2)}\n`)
process.stdout.write(`${outPath}\n`)
