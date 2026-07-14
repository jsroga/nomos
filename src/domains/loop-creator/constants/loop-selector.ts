/** Loop selector UI copy and locale options. */

export const LOOP_SELECTOR_DEFAULT_NAME = 'New Loop'

export const LOOP_SELECTOR_DELETE_TITLE = 'Delete Loop'
export const LOOP_SELECTOR_DELETE_CONFIRM = 'Delete'
export const LOOP_SELECTOR_DELETE_CANCEL = 'Cancel'

export const LOOP_SELECTOR_RESET_TITLE = 'Reset Canvas'
export const LOOP_SELECTOR_RESET_DESCRIPTION =
  'This will clear all nodes and edges from the current loop. Are you sure?'
export const LOOP_SELECTOR_RESET_CONFIRM = 'Reset'
export const LOOP_SELECTOR_RESET_CANCEL = 'Cancel'

export const LOOP_SELECTOR_FETCH_FAILED_LOG = 'Failed to fetch loops:'
export const LOOP_SELECTOR_DELETE_FAILED_LOG = 'Failed to delete loop:'

export enum LoopSelectorLocale {
  Tag = 'en-US',
  Month = 'short',
  Day = 'numeric',
  Hour = '2-digit',
  Minute = '2-digit',
}

export enum LoopSelectorConfirmVariant {
  Destructive = 'destructive',
}
