/**
 * Next substitutes `NEXT_PUBLIC_*` at build time **only** where the source
 * contains the literal member expression. A loop, a computed key or a helper
 * defeats the substitution and ships `undefined` to the browser — silently,
 * because nothing errors.
 *
 * The outcome is verified against the built bundle (see docs/DEVELOPMENT.md);
 * this protects the precondition, which is the part a refactor would break.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const SOURCE = readFileSync('src/shared/config/env.client.ts', 'utf8')
const OBJECT = SOURCE.slice(SOURCE.indexOf('export const clientEnv'))

describe('env.client.ts stays inlineable', () => {
  it('reads every value as a literal member expression', () => {
    const reads = [...OBJECT.matchAll(/process\.env\.?(\[?)/g)].map(match => match[1])

    expect(reads.length).toBeGreaterThan(0)
    expect(reads.filter(bracket => bracket === '[')).toEqual([])
  })

  it('names only NEXT_PUBLIC_ variables, never a server secret', () => {
    const names = [...OBJECT.matchAll(/process\.env\.([A-Z_0-9]+)/g)].map(match => match[1])

    expect(names.filter(name => !name.startsWith('NEXT_PUBLIC_'))).toEqual([])
  })

  it('does not iterate — a loop over keys would not be substituted', () => {
    expect(OBJECT).not.toMatch(/\bfor\b|\.map\(|Object\.(keys|entries|fromEntries)\(/)
  })
})
