/**
 * Gate fixture — MUST fail `local/no-bare-project-id-param`.
 * Lives under a `/services/` path so the rule applies. Never imported by src/.
 */
// Expected error: local/no-bare-project-id-param
export function listThings(projectId: string): string[] {
  return [projectId]
}
