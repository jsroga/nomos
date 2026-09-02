import { redirect } from 'next/navigation'
import { isAdminUser } from '@/shared/auth/admin-users'
import { getUserSession } from '@/shared/auth/auth'
import { AdminShell } from '@/shared/admin/ui/AdminShell'
import { ADMIN_TITLE } from '@/shared/admin/constants/admin-nav'
import type { Metadata } from 'next'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

export const metadata: Metadata = {
  title: ADMIN_TITLE,
}

const NON_ADMIN_REDIRECT = '/'

/**
 * Single admin gate for all `/admin/*` routes (Track A0). Server-side check via
 * the verified user email against NEXT_PUBLIC_CENTRAL_USERS; non-admins are
 * redirected home before any admin UI renders.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session } = await getUserSession()

  if (!session || !isAdminUser(session.user.email)) {
    redirect(NON_ADMIN_REDIRECT)
  }

  return <AdminShell>{children}</AdminShell>
}
