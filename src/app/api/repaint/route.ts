import {
  withAuth,
  withRateLimit,
} from '@/shared/data/api-utils'
import { handleRepaintRequest } from './repaint-handler'

/**
 * POST /api/repaint
 * Enqueue Flux Fill inpainting on Trigger.dev.
 */
export const POST = withRateLimit(withAuth(handleRepaintRequest), {
  maxRequests: 10,
  windowMs: 60000,
})
