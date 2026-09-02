#!/usr/bin/env node
/**
 * Every key in the server schema must appear in `.env.local.example`.
 *
 * 63 variables were read and 28 were written down, so at least 35 were needed
 * somewhere and documented nowhere. This closes that permanently.
 *
 * SPEC-12 Task 6 called for *generating* the example from the schema. It is a
 * check instead: the committed file carries grouping and per-key guidance that
 * a generator would flatten, and the gap being closed is coverage, not
 * formatting. Generation would trade something useful for something tidy.
 */
import { readFileSync } from 'node:fs'

const SCHEMA = 'src/shared/config/env.ts'
const EXAMPLE = '.env.local.example'
const CLIENT = 'src/shared/config/env.client.ts'

/** Keys declared in the Zod object, in declaration order. */
function schemaKeys() {
  const source = readFileSync(SCHEMA, 'utf8')
  const body = source.slice(source.indexOf('z.object({'), source.indexOf('})\n\nexport type'))
  return [...body.matchAll(/^\s{2}([A-Z][A-Z_0-9]+):/gm)].map(match => match[1])
}

/** `NEXT_PUBLIC_*` keys the client module exposes — the object only, not its prose. */
function clientKeys() {
  const source = readFileSync(CLIENT, 'utf8')
  const object = source.slice(source.indexOf('export const clientEnv'))
  return [...object.matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z_0-9]+)/g)].map(match => match[1])
}

function documentedKeys() {
  return new Set(
    readFileSync(EXAMPLE, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => /^[A-Z][A-Z_0-9]*=/.test(line))
      .map(line => line.split('=')[0])
  )
}

function main() {
  const documented = documentedKeys()
  const missing = [...schemaKeys(), ...clientKeys()].filter(key => !documented.has(key))

  if (missing.length > 0) {
    console.error(`\n${EXAMPLE} is missing ${missing.length} key(s) the code reads:\n`)
    for (const key of missing) console.error(`  ${key}=`)
    console.error(`\nAdd them with a one-line comment saying what they are for.\n`)
    process.exit(1)
  }

  console.log(`env:check OK — ${documented.size} documented`)
}

main()
