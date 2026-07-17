import {
  withAuth,
  withRateLimit,
} from '@/shared/data/api-utils'
import { handleRepaintRequest } from './repaint-handler'

// eslint-disable-next-line local/no-magic-string -- Next.js segment config must be a statically analyzable literal (user-approved exception, 2026-07-09)
export const dynamic = 'force-dynamic'

/**
 * POST /api/repaint
 * Server-side Gemini inpainting for the repaint tool.
 */
export const POST = withRateLimit(withAuth(handleRepaintRequest), {
  maxRequests: 10,
  windowMs: 60000,
})
