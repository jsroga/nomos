import {
  EPISODE_MANAGER_RENAME_LABEL,
  EPISODE_MANAGER_SAVE_LABEL,
} from './constants/episode-manager'

export enum EpisodeTitleActionMode {
  Rename = 'rename',
  Save = 'save',
}

export function episodeTitleActionMode(
  editingId: string | null,
  episodeId: string,
): EpisodeTitleActionMode {
  return editingId === episodeId ? EpisodeTitleActionMode.Save : EpisodeTitleActionMode.Rename
}

export function episodeTitleActionLabel(mode: EpisodeTitleActionMode): string {
  return mode === EpisodeTitleActionMode.Save
    ? EPISODE_MANAGER_SAVE_LABEL
    : EPISODE_MANAGER_RENAME_LABEL
}

export function shouldPersistEpisodeRename(draftTitle: string): boolean {
  return draftTitle.trim().length > 0
}
