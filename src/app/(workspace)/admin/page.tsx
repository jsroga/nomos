import { ModelSettingsAdmin } from '@/shared/admin/ui/ModelSettingsAdmin'

/**
 * Admin → Models (Track A1). The per-role model routing panel lives at the
 * dashboard root; there is no standalone `/admin/models` sub-page.
 */
export default function AdminModelsPage() {
  return <ModelSettingsAdmin />
}
