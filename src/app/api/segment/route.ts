import { withAuth, withRateLimit } from '@/shared/data/api-utils'
import { handleSegmentRequest } from './segment-handler'

/**
 * POST /api/segment
 * Enqueue SAM-3 segmentation on Trigger.dev.
 */
export const POST = withRateLimit(withAuth(handleSegmentRequest), {
  maxRequests: 10,
  windowMs: 60000,
})
