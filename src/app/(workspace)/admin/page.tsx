import { ModelSettingsAdmin } from '@/shared/admin/ui/ModelSettingsAdmin'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

/**
 * Admin → Models (Track A1). The per-role model routing panel lives at the
 * dashboard root; there is no standalone `/admin/models` sub-page.
 */
export default function AdminModelsPage() {
  return <ModelSettingsAdmin />
}
