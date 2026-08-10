import { AdminPluginsList } from '@/shared/admin/ui/AdminPluginsList'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

/**
 * Admin → Plugins (Track A4). Renders the registered admin plugin manifest.
 */
export default function AdminPluginsPage() {
  return <AdminPluginsList />
}
