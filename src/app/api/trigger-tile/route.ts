import {
  withAuth,
  withRateLimit,
} from '@/shared/data/api-utils'
import { handleTriggerTileRequest } from './trigger-tile-handler'

export const POST = withRateLimit(withAuth(handleTriggerTileRequest), {
  maxRequests: 20,
  windowMs: 60000,
})
