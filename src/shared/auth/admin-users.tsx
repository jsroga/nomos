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
