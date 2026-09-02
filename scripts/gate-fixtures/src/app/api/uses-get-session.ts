/**
 * Gate fixture — MUST fail the server getSession ban.
 *
 * Asserted by scripts/__tests__/gate-fixtures.test.ts. Never imported by src/.
 */
export async function readUnverifiedSession(client: {
  auth: { getSession: () => Promise<unknown> }
}) {
  return client.auth.getSession()
}
