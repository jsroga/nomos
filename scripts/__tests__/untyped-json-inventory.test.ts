/**
 * SPEC-16's burn-down meter: where a shape is established.
 *
 * `recordFromJson` and `readString` are not bugs — this repo bans `as`, and
 * they were the honest way to handle untyped data. The problem is *where* they
 * run: guarding field by field at a thousand call sites means the shape is
 * never established anywhere, so a payload that lost a field produces
 * `undefined` at whichever reader touches it first, far from the cause.
 *
 * **This spec ends with the guard count still in four figures.** The ratchet
 * stops it growing while the migration proceeds module by module; recording
 * that plainly is the point, because an exit condition claiming otherwise
 * would be a lie the next reader has to discover.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// The .mjs harness is shared by SPEC-12/13/14/16 and carries no types by design.
import { inventory } from '../inventory/index.mjs'
import { UntypedJsonBucket, classifyUntypedJsonRead } from '../inventory/matchers.mjs'

const RATCHET = JSON.parse(readFileSync('.quality-ratchet.json', 'utf8'))

/** Modules whose contracts have landed; their count may only fall. */
const CONVERTED_MODULES = ['3d-asset-exporter']

function buckets(): Record<string, string[]> {
  return inventory(classifyUntypedJsonRead).identitiesByBucket
}

describe('untyped JSON reads', () => {
  it('does not grow the guard count SPEC-16 is burning down', () => {
    const guards = buckets()[UntypedJsonBucket.Guard] ?? []

    expect(guards.length).toBeLessThanOrEqual(RATCHET.untypedJsonReads)
  })

  it('does not grow the database spellings that escaped their mapper', () => {
    const reads = buckets()[UntypedJsonBucket.SnakeCaseRead] ?? []

    expect(reads.length).toBeLessThanOrEqual(RATCHET.snakeCaseReadsOutsideMappers)
  })

  it('does not let a converted module regress, so half-done is a stable state', () => {
    const reads = buckets()[UntypedJsonBucket.SnakeCaseRead] ?? []
    const inConverted = reads.filter(id =>
      CONVERTED_MODULES.some(moduleName => id.includes(`src/domains/${moduleName}/`)),
    )

    expect(inConverted.length).toBeLessThanOrEqual(RATCHET.snakeCaseReadsInConvertedModules)
  })

  it('does not grow the schemas that forward unknown keys', () => {
    const schemas = buckets()[UntypedJsonBucket.Passthrough] ?? []

    expect(schemas.length).toBeLessThanOrEqual(RATCHET.passthroughSchemas)
  })

  it('has no z.any(), which disables checking on everything downstream', () => {
    const uses = buckets()[UntypedJsonBucket.ZodAny] ?? []

    expect(uses.length).toBeLessThanOrEqual(RATCHET.zodAnyUses)
  })
})
