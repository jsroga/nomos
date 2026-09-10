/** Fix-inconsistencies blocking dialog copy and class tokens. */

export enum FixInconsistenciesStorageKey {
  RunPrefix = 'storyteller:consistencyFixRun:',
}

export enum ConsistencyFixRunPhase {
  Idle = 'idle',
  Scanning = 'scanning',
  Review = 'review',
  Applying = 'applying',
  Done = 'done',
  Error = 'error',
}

export enum FixInconsistenciesDialogCopy {
  Title = 'Fix inconsistencies',
  Scanning = 'Scanning World Bible and all episodes…',
  Applying = 'Applying patches…',
  Cancel = 'Cancel',
  ApplyAll = 'Apply all',
  Discard = 'Discard',
  Close = 'Close',
  Skipped = 'Skipped',
  Unpatchable = 'Cannot auto-patch',
  ProposedPatch = 'Proposed patch',
  Empty = 'Nothing to check — no episodes or beats in this project.',
  NoFindings = 'No inconsistencies detected.',
}

export enum FixInconsistenciesToastCopy {
  ChatBusy = 'Writers Room is busy — wait for the current turn to finish.',
  PendingBible = 'Accept or reject pending World Bible changes first.',
  AlreadyRunning = 'A consistency pass is already running.',
  StartFailed = 'Could not start the consistency pass.',
  ApplyFailed = 'Could not apply consistency patches.',
}

export enum FixInconsistenciesDialogClass {
  Content = 'max-w-2xl max-h-[85vh] overflow-hidden flex flex-col',
  HideClose = '[&>button.absolute]:hidden',
  List = 'max-h-[52vh]',
  SkipRow = 'text-[11px] text-muted-foreground border border-border/40 rounded-md px-3 py-2',
}

export function consistencyFixRunStorageKey(projectId: string): string {
  return `${FixInconsistenciesStorageKey.RunPrefix}${projectId}`
}

export function isConsistencyFixRunBusy(phase: ConsistencyFixRunPhase): boolean {
  return phase !== ConsistencyFixRunPhase.Idle
}
