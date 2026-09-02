/**
 * Gate fixture — MUST fail `local/no-bare-project-id-param`.
 *
 * The escape hatch applies to the declaration it sits above, not the file. If
 * it ever goes file-wide again, `listThings` below stops being reported and
 * this fixture passes lint, which fails the fixture test.
 */

/** project-scope: none — exempt, and only this one. */
export function exemptThing(projectId: string): string {
  return projectId
}

// Expected error: local/no-bare-project-id-param
export function listThings(projectId: string): string[] {
  return [projectId]
}
