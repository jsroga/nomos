/** Auto-save hook status and error copy. */

export enum LoopAutoSaveStatus {
  Idle = 'idle',
  Saving = 'saving',
  Saved = 'saved',
  Error = 'error',
}

export enum LoopAutoSaveMessage {
  FailedToSave = 'Failed to save',
  SaveFailed = 'Save failed',
  AutoSaveFailedLog = 'Auto-save failed:',
}
