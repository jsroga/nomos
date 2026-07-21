import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getUserSession } from '@/shared/auth/auth'
import { isAdminUser } from '@/shared/auth/admin-users'
import { ModelSettingsAdmin } from '@/shared/admin/ui/ModelSettingsAdmin'

const HOME_ROUTE = '/'
const ADMIN_MODELS_TITLE = 'Model settings · Admin'

export const metadata: Metadata = {
  title: ADMIN_MODELS_TITLE,
}

/** Admin-only model routing panel. Non-admins are redirected home. */
export default async function AdminModelsPage() {
  const { session } = await getUserSession()
  if (!session || !isAdminUser(session.user.email)) {
    redirect(HOME_ROUTE)
  }
  return <ModelSettingsAdmin />
}
