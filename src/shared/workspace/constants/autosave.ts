export enum AutosaveStatus {
  Idle = 'idle',
  Saving = 'saving',
  Saved = 'saved',
  Error = 'error',
}

export enum AutosaveScope {
  EpisodeScript = 'episode-script',
  Loop = 'loop',
  InteriorDesign = 'interior-design',
}

export enum AutosaveCopy {
  Saving = 'Saving',
  Saved = 'Saved',
  Failed = 'Save failed',
}

export const AUTOSAVE_DEBOUNCE_MS = 2000
export const AUTOSAVE_SAVED_VISIBLE_MS = 2000
