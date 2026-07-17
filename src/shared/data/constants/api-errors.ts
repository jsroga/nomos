/**
 * API route error and message strings — use instead of inline literals in routes.
 */

export { API_ERROR } from './api-error-messages'
export { API_LOG_PREFIX } from './api-error-log-prefix'

export const NEXT_ROUTE = {
  FORCE_DYNAMIC: 'force-dynamic',
  RUNTIME_NODEJS: 'nodejs',
} as const

export const TRIGGER_TASK_ID = {
  GENERATE_POSTER: 'generate-poster',
  REMESH_3D_MODEL: 'remesh-3d-model',
  SELECT_MJ_VARIANT: 'select-mj-variant',
  GENERATE_MOODBOARD: 'generate-moodboard',
  GENERATE_PORTRAIT: 'generate-portrait',
  SURFACE_MATERIAL: 'surface-material',
  TEXT_TO_3D: 'text-to-3d',
  RETEXTURE_MODEL: 'retexture-model',
  GENERATE_3D_MODEL: 'generate-3d-model',
  ENHANCE_FIDELITY: 'enhance-fidelity',
  GENERATE_TILE: 'generate-tile',
} as const

export const TRIGGER_TOKEN_EXPIRY = '1h' as const

export const TRIGGER_TASK_TTL = {
  REMESH: '30m',
  SELECT_VARIANT: '5m',
  ONE_HOUR: '1h',
  GENERATE_3D: '30m',
  FIDELITY: '10m',
  GENERATE_TILE: '10m',
} as const

export const RATE_LIMIT = {
  KEY_PREFIX: 'rl',
  ANONYMOUS_KEY: 'anonymous',
  FORWARDED_FOR_HEADER: 'x-forwarded-for',
  REMAINING_HEADER: 'X-RateLimit-Remaining',
  RESET_HEADER: 'X-RateLimit-Reset',
} as const
