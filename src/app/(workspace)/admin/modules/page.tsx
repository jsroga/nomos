import { ModuleSettingsAdmin } from '@/shared/admin/ui/ModuleSettingsAdmin'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

/**
 * Admin → Modules (Track A2). Enable/configure canvas modules; overrides the
 * CANVAS_MODULES catalog defaults via the module_settings table.
 */
export default function AdminModulesPage() {
  return <ModuleSettingsAdmin />
}
