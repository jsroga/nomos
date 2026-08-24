/**
 * Gate fixture — MUST fail `local/no-discarded-auth-context`.
 *
 * The rule only applies under src/app/api, so the fixture lives at a path that
 * matches — inside scripts/gate-fixtures, which is excluded from the repo-wide
 * lint run. Asserted by scripts/__tests__/gate-fixtures.test.ts. Never imported.
 */
interface AuthenticatedRequest {
  session: { user: { id: string } }
}

// Expected error: local/no-discarded-auth-context
export const GET = async (_request: unknown, _auth: AuthenticatedRequest) => {
  return { leaked: true }
}

// Expected error: local/no-discarded-auth-context
export const POST = async (_request: unknown, { session: _session }: AuthenticatedRequest) => {
  return { leaked: true }
}
