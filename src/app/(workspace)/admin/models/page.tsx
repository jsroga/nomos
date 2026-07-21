import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { isAdminUser } from '@/shared/auth/admin-users'
import { ModelSettingsAdmin } from '@/shared/admin/ui/ModelSettingsAdmin'

const HOME_ROUTE = '/'
const ADMIN_MODELS_TITLE = 'Model settings · Admin'

export const metadata: Metadata = {
  title: ADMIN_MODELS_TITLE,
}

/** Admin-only model routing panel. Non-admins are redirected home. */
export default async function AdminModelsPage() {
  const cookieStore = await cookies()
  // @ts-expect-error - Next 15 cookies are async but auth-helpers expects a specific type that conflicts in this version
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session || !isAdminUser(session.user.email)) {
    redirect(HOME_ROUTE)
  }

  return <ModelSettingsAdmin />
}
