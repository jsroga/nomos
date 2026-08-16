/** Episode manager UI copy and log messages. */

export const EPISODE_MANAGER_UNTITLED = 'Untitled Episode'
export const EPISODE_MANAGER_RENAMED_TOAST = 'Episode renamed'
export const EPISODE_MANAGER_SAVE_LABEL = 'Save'
export const EPISODE_MANAGER_RENAME_LABEL = 'Rename episode'
export const EPISODE_MANAGER_DELETE_TITLE = 'Delete Episode'
export const EPISODE_MANAGER_DELETE_CONFIRM = 'Delete'
export const EPISODE_MANAGER_DELETE_CANCEL = 'Cancel'
export const EPISODE_MANAGER_DELETE_FAILED = 'Failed to delete'
export const EPISODE_MANAGER_DELETE_ERROR_LOG = 'Failed to delete episode:'
export const EPISODE_MANAGER_FETCH_FAILED_LOG = 'Failed to fetch episodes:'
export const EPISODE_MANAGER_FETCH_ERROR_LOG = 'Error fetching episodes:'

export function episodeDeleteDescription(title: string): string {
  return `Are you sure you want to delete "${title || EPISODE_MANAGER_UNTITLED}"? This cannot be undone.`
}
