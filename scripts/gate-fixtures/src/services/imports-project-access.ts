/**
 * Gate fixture — MUST fail `no-restricted-imports`.
 * Reaching past projectScope() to the raw boolean check is the thing this
 * whole migration removed. Never imported by src/.
 */
// Expected error: no-restricted-imports
import { verifyProjectAccess } from '@/shared/auth/project-access'

export const check = verifyProjectAccess
