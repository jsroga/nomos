/** Episode manager UI copy and log messages. */

import { Phase, type PhaseId } from '@/domains/storyteller/core/types/enums'
import { PhaseNavigatorShortLabel } from '@/domains/storyteller/ui/PhaseNavigator/constants/phase-navigator'

export const EPISODE_MANAGER_UNTITLED = 'Untitled Episode'
export const EPISODE_MANAGER_NEW = 'New episode'
export const EPISODE_MANAGER_EMPTY_HINT =
  'Episodes are generated from the storybible. The header switch stays on STORYBIBLE until the first one exists.'
export const EPISODE_MANAGER_SECTION = 'EPISODES'
export const EPISODE_MANAGER_EMPTY_COUNT = '(0)'
export const EPISODE_MANAGER_ADD = 'Add episode'
export const EPISODE_MANAGER_DELETE_TOOLTIP = 'Delete episode'
export const EPISODE_MANAGER_INDEX_PREFIX = '#'
export const EPISODE_MANAGER_LOADING_COUNT = 3

export function formatEpisodeIndex(sequence: number): string {
  return `${EPISODE_MANAGER_INDEX_PREFIX}${sequence}`
}

export function formatEpisodesHeading(count: number): string {
  if (count === 0) return `${EPISODE_MANAGER_SECTION} ${EPISODE_MANAGER_EMPTY_COUNT}`
  return EPISODE_MANAGER_SECTION
}

export enum EpisodeManagerRowClass {
  Row = 'group relative w-full flex items-center gap-[11px] px-3 py-2.5 rounded-[9px] cursor-pointer transition-all duration-150 ease-in-out',
  RowSelected = 'bg-[hsl(var(--primary)/0.13)]',
  RowIdle = 'text-muted-foreground hover:bg-accent/40',
  Index = 'inline-flex items-center h-5 shrink-0 font-mono text-[11px] leading-none translate-y-px',
  IndexSelected = 'text-primary/90',
  IndexIdle = 'text-muted-foreground/60',
  TitleCluster = 'flex-1 min-w-0 flex items-center gap-[8px]',
  Title = 'inline-flex items-center h-5 w-fit max-w-full min-w-0 truncate text-[13.5px] leading-none',
  TitleSelected = 'text-foreground',
  TitleInput = 'bg-transparent border-b-2 border-primary focus:outline-none flex-1 min-w-0 h-5 text-[13.5px]',
  Chip = 'inline-flex items-center h-5 shrink-0 font-mono text-[9.5px] leading-none tracking-[0.12em] uppercase text-primary translate-y-px',
  Actions = 'gap-1',
  ActionsIdle = 'absolute right-2 inset-y-0 hidden group-hover:flex items-center',
  ActionsEditing = 'flex shrink-0',
}

export enum EpisodeManagerEmptyClass {
  Cta = 'w-full h-[38px] rounded-[9px] bg-[hsl(var(--primary)/0.18)] shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.4)] text-primary text-[13px] font-medium gap-[9px] hover:bg-[hsl(var(--primary)/0.24)]',
  Hint = 'mt-2.5 px-0.5 text-[11.5px] leading-[1.6] text-muted-foreground/70',
}

export function episodePhaseChipLabel(phase: PhaseId): string {
  if (phase === Phase.BREAKING) return PhaseNavigatorShortLabel.Break
  if (phase === Phase.WRITING || phase === Phase.COMPLETE) return PhaseNavigatorShortLabel.Write
  return PhaseNavigatorShortLabel.Premise
}
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
export const EPISODE_MANAGER_CACHE_PREFIX = 'episodes:'
export const EPISODE_MANAGER_CREATE_TITLE = 'New Episode'
export const EPISODE_MANAGER_CREATE_DESCRIPTION =
  'Enter a title for the new episode. You can change this later.'
export const EPISODE_MANAGER_CREATE_PLACEHOLDER = 'e.g. The Call to Adventure'
export const EPISODE_MANAGER_CREATE_CONFIRM = 'Create Episode'
export const EPISODE_MANAGER_CREATE_INPUT_ID = 'name'

export function episodeCacheKey(projectId: string): string {
  return `${EPISODE_MANAGER_CACHE_PREFIX}${projectId}`
}

export function episodeDeleteDescription(title: string): string {
  return `Are you sure you want to delete "${title || EPISODE_MANAGER_UNTITLED}"? This cannot be undone.`
}
