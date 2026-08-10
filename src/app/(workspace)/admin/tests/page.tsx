import { TestsDashboard } from '@/shared/admin/ui/TestsDashboard'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

/**
 * Admin → Tests (Track A3). Read-only Playwright results from the latest run.
 */
export default function AdminTestsPage() {
  return <TestsDashboard />
}
