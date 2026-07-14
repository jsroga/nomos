/** Bible lock API wire values. */

export enum BibleLockAction {
  Lock = 'lock',
  Unlock = 'unlock',
}

export { SupabaseTable, SupabaseColumn } from '@/shared/data/constants/protocol'

export const BIBLE_LOCK_ACTION_INVALID = 'Action must be "lock" or "unlock"'
export const BIBLE_LOCK_UPDATE_FAILED = 'Failed to update lock status'
export const BIBLE_LOCK_UPDATE_ERROR = 'Failed to update Bible lock status'
export const BIBLE_LOCK_GET_FAILED = 'Failed to get Bible lock status'

export const BIBLE_LOCK_LOG_UPDATE_ERROR = '[Bible Lock API] Update error:'
export const BIBLE_LOCK_LOG_ERROR = '[Bible Lock API] Error:'
export const BIBLE_LOCK_LOG_FETCH_ERROR = '[Bible Lock API] Fetch error:'
