/**
 * Bible Lock Permissions System
 *
 * Controls who can lock/unlock the Series Bible.
 * Central users can lock the Bible to prevent changes.
 */

import { BIBLE_PERMISSION_EMAILS } from '@/shared/auth/constants/bible-permissions'

/**
 * Get list of central users from environment
 */
export function getCentralUsers(): string[] {
  const envValue =
    process.env.NEXT_PUBLIC_CENTRAL_USERS || BIBLE_PERMISSION_EMAILS
  return envValue.split(',').map(email => email.trim().toLowerCase())
}

/**
 * Check if a user is a central user (can lock/unlock Bible)
 */
export function isCentralUser(userEmail?: string | null): boolean {
  if (!userEmail) return false

  const centralUsers = getCentralUsers()
  const normalizedEmail = userEmail.trim().toLowerCase()

  return centralUsers.includes(normalizedEmail)
}

/**
 * Check if user can edit Bible based on lock state
 */
export function canEditBible(userEmail?: string | null, isBibleLocked?: boolean): boolean {
  // If Bible is not locked, anyone can edit
  if (!isBibleLocked) return true

  // If Bible is locked, only central users can edit
  return isCentralUser(userEmail)
}
