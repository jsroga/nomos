/**
 * Honor-system counters in .quality-ratchet.json must have a Vitest consumer.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { honorCounts } from '../inventory/honor.mjs'

const RATCHET = JSON.parse(readFileSync('.quality-ratchet.json', 'utf8'))
const COUNTS = honorCounts()

describe('honor-system ratchet consumers', () => {
  it('has no untagged run-grace window left in owned-run', () => {
    expect(COUNTS.untaggedRunGracePaths).toBeLessThanOrEqual(RATCHET.untaggedRunGracePaths)
  })

  it('does not grow session-existence-only API routes', () => {
    expect(COUNTS.sessionExistenceOnlyRoutes).toBeLessThanOrEqual(
      RATCHET.sessionExistenceOnlyRoutes,
    )
  })

  it('does not grow direct db client importers', () => {
    expect(COUNTS.directDbClientImporters).toBeLessThanOrEqual(RATCHET.directDbClientImporters)
  })

  it('does not grow service-role client sites', () => {
    expect(COUNTS.serviceRoleClientSites).toBeLessThanOrEqual(RATCHET.serviceRoleClientSites)
  })

  it('does not grow systemScope call sites outside project-scope', () => {
    expect(COUNTS.systemScopeSites).toBeLessThanOrEqual(RATCHET.systemScopeSites)
  })

  it('does not grow routes that take a project id without an ownership check', () => {
    expect(COUNTS.routesTakingProjectIdWithoutOwnershipCheck).toBeLessThanOrEqual(
      RATCHET.routesTakingProjectIdWithoutOwnershipCheck,
    )
  })

  it('does not grow Eval-Skip commits', () => {
    expect(COUNTS.evalSkipCommits).toBeLessThanOrEqual(RATCHET.evalSkipCommits)
  })

  it('does not grow constants/ files that declare functions', () => {
    expect(COUNTS.constantsFilesWithFunctions).toBeLessThanOrEqual(RATCHET.constantsFilesWithFunctions)
  })
})
