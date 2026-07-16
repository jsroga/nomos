import { HttpMethod } from '@/shared/data/constants/protocol'
import { BibleLockAction } from '@/domains/storyteller/core/io/constants/bible-lock'

export { HttpMethod as BibleContextHttpMethod, BibleLockAction }

export const BIBLE_CONTEXT_LOCK_API_PATH = '/api/storyteller/bible/lock'
export const BIBLE_CONTEXT_LOCK_CACHE_PREFIX = 'bible-lock:'

export const BIBLE_CONTEXT_LOG_PARENT_CAUGHT_UP =
  '[BibleContext] Parent caught up with saved data. Clearing lock.'
export const BIBLE_CONTEXT_LOG_LOCK_FETCH_FAILED = '[Bible Context] Failed to fetch lock status:'
export const BIBLE_CONTEXT_TOAST_UPDATED = 'World Bible updated'
export const BIBLE_CONTEXT_TOAST_LOCKED = '🔒 Bible locked'
export const BIBLE_CONTEXT_TOAST_UNLOCKED = '🔓 Bible unlocked'
export const BIBLE_CONTEXT_TOAST_LOCK_FAILED = 'Failed to update lock status'
export const BIBLE_CONTEXT_DEFAULT_WORLD_RULE_CATEGORY = 'Society'
export const BIBLE_CONTEXT_HOOK_ERROR = 'useBible must be used within a BibleProvider'
