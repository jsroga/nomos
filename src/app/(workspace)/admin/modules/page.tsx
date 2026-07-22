import { ModuleSettingsAdmin } from '@/shared/admin/ui/ModuleSettingsAdmin'

/**
 * Admin → Modules (Track A2). Enable/configure canvas modules; overrides the
 * CANVAS_MODULES catalog defaults via the module_settings table.
 */
export default function AdminModulesPage() {
  return <ModuleSettingsAdmin />
}
