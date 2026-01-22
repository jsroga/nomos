/**
 * Admin/Central User System
 *
 * Provides special permissions for admin users including:
 * - Bible lock/unlock capability
 * - Onboarding bypass
 * - Advanced features access
 */

/**
 * Get list of admin users from environment
 */
export function getAdminUsers(): string[] {
  const envValue = process.env.NEXT_PUBLIC_CENTRAL_USERS || 'jacek.sroga.itc@gmail.com'
  return envValue.split(',').map(email => email.trim().toLowerCase())
}

/**
 * Check if a user is an admin user
 */
export function isAdminUser(userEmail?: string | null): boolean {
  if (!userEmail) return false

  const adminUsers = getAdminUsers()
  const normalizedEmail = userEmail.trim().toLowerCase()

  return adminUsers.includes(normalizedEmail)
}

/**
 * Check if user should bypass onboarding
 */
export function shouldBypassOnboarding(userEmail?: string | null): boolean {
  return isAdminUser(userEmail)
}

/**
 * Get admin badge config
 */
export function getAdminBadge(userEmail?: string | null): {
  isAdmin: boolean
  badge?: React.ReactNode
} {
  const isAdmin = isAdminUser(userEmail)

  if (!isAdmin) {
    return { isAdmin: false }
  }

  return {
    isAdmin: true,
    badge: (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-lg">
        <span>⭐</span>
        <span>ADMIN</span>
      </span>
    ),
  }
}
