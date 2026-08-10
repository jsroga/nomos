import {
  withAuth,
  withRateLimit,
} from '@/shared/data/api-utils'
import { handleRepaintRequest } from './repaint-handler'

/**
 * POST /api/repaint
 * Server-side Gemini inpainting for the repaint tool.
 */
export const POST = withRateLimit(withAuth(handleRepaintRequest), {
  maxRequests: 10,
  windowMs: 60000,
})
