import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { isAdminUser } from '@/shared/auth/admin-users'
import { AdminShell } from '@/shared/admin/ui/AdminShell'
import { ADMIN_TITLE } from '@/shared/admin/constants/admin-nav'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: ADMIN_TITLE,
}

const NON_ADMIN_REDIRECT = '/'

/**
 * Single admin gate for all `/admin/*` routes (Track A0). Server-side check via
 * the Supabase session email against NEXT_PUBLIC_CENTRAL_USERS; non-admins are
 * redirected home before any admin UI renders.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  // @ts-expect-error - Next 15 cookies are async; auth-helpers calls the accessor sync
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session || !isAdminUser(session.user.email)) {
    redirect(NON_ADMIN_REDIRECT)
  }

  return <AdminShell>{children}</AdminShell>
}
