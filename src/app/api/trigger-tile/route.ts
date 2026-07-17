import {
  withAuth,
  withRateLimit,
} from '@/shared/data/api-utils'
import { handleTriggerTileRequest } from './trigger-tile-handler'

// eslint-disable-next-line local/no-magic-string -- Next.js segment config must be a statically analyzable literal (user-approved exception, 2026-07-09)
export const dynamic = 'force-dynamic'

export const POST = withRateLimit(withAuth(handleTriggerTileRequest), {
  maxRequests: 20,
  windowMs: 60000,
})
