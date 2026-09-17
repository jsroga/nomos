/**
 * Honor-system counters in .quality-ratchet.json must have a Vitest consumer.
 */

import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { honorCounts } from '../inventory/honor.mjs'

const RATCHET = JSON.parse(readFileSync('.quality-ratchet.json', 'utf8'))

let loaded: ReturnType<typeof honorCounts> | undefined

describe('honor-system ratchet consumers', () => {
  beforeAll(() => {
    loaded = honorCounts()
  }, 60_000)

  it('has no untagged run-grace window left in owned-run', () => {
    expect(loaded?.untaggedRunGracePaths).toBeLessThanOrEqual(RATCHET.untaggedRunGracePaths)
  })

  it('does not grow session-existence-only API routes', () => {
    expect(loaded?.sessionExistenceOnlyRoutes).toBeLessThanOrEqual(
      RATCHET.sessionExistenceOnlyRoutes,
    )
  })

  it('does not grow direct db client importers', () => {
    expect(loaded?.directDbClientImporters).toBeLessThanOrEqual(RATCHET.directDbClientImporters)
  })

  it('does not grow service-role client sites', () => {
    expect(loaded?.serviceRoleClientSites).toBeLessThanOrEqual(RATCHET.serviceRoleClientSites)
  })

  it('does not grow systemScope call sites outside project-scope', () => {
    expect(loaded?.systemScopeSites).toBeLessThanOrEqual(RATCHET.systemScopeSites)
  })

  it('does not grow routes that take a project id without an ownership check', () => {
    expect(loaded?.routesTakingProjectIdWithoutOwnershipCheck).toBeLessThanOrEqual(
      RATCHET.routesTakingProjectIdWithoutOwnershipCheck,
    )
  })

  it('does not grow Eval-Skip commits', () => {
    expect(loaded?.evalSkipCommits).toBeLessThanOrEqual(RATCHET.evalSkipCommits)
  })

  it('does not grow constants/ files that declare functions', () => {
    expect(loaded?.constantsFilesWithFunctions).toBeLessThanOrEqual(RATCHET.constantsFilesWithFunctions)
  })
})
