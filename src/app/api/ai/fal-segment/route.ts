import { withAuth, withRateLimit } from '@/shared/data/api-utils'
import { handleSegmentRequest } from '../../segment/segment-handler'

/**
 * POST /api/ai/fal-segment
 * Enqueue SAM-3 segmentation (same Trigger job as POST /api/segment).
 */
export const POST = withRateLimit(withAuth(handleSegmentRequest), {
  maxRequests: 30,
  windowMs: 60000,
})
