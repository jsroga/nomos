/** Fix-inconsistencies blocking dialog copy and class tokens. */

import { FixInconsistenciesStepId } from '@/domains/storyteller/ai/workflows/constants/fix-inconsistencies-workflow'

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
  AssembleCanon = 'Reading World Bible and episodes…',
  StructuralScan = 'Checking setup and payoff links…',
  AgenticScan = 'Continuity Critic is scanning each section…',
  ProposeFixes = 'GRRM Author is proposing patches…',
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
  Review = 'Review proposed patches.',
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
  ScanList = 'flex flex-col gap-2 py-4 text-sm',
  ScanRow = 'flex items-center gap-2',
  ScanDone = 'text-emerald-500',
  ScanCurrent = 'text-muted-foreground',
  ApplyingRow = 'flex items-center gap-3 py-6 text-sm text-muted-foreground',
}

export function consistencyFixRunStorageKey(projectId: string): string {
  return `${FixInconsistenciesStorageKey.RunPrefix}${projectId}`
}

export function isConsistencyFixRunBusy(phase: ConsistencyFixRunPhase): boolean {
  return phase !== ConsistencyFixRunPhase.Idle
}

export function scanningCopyForStep(stepId: string | null): string {
  if (stepId === FixInconsistenciesStepId.AssembleCanon) {
    return FixInconsistenciesDialogCopy.AssembleCanon
  }
  if (stepId === FixInconsistenciesStepId.StructuralScan) {
    return FixInconsistenciesDialogCopy.StructuralScan
  }
  if (stepId === FixInconsistenciesStepId.AgenticScan) {
    return FixInconsistenciesDialogCopy.AgenticScan
  }
  if (stepId === FixInconsistenciesStepId.ProposeFixes) {
    return FixInconsistenciesDialogCopy.ProposeFixes
  }
  return FixInconsistenciesDialogCopy.Scanning
}

export function nextCompletedScanSteps(
  completedStepIds: readonly string[],
  currentStepId: string | null,
  incomingStepId: string,
): { completedStepIds: string[]; stepId: string } | null {
  if (incomingStepId === currentStepId) return null
  if (completedStepIds.includes(incomingStepId)) return null
  const next = [...completedStepIds]
  if (currentStepId && !next.includes(currentStepId)) {
    next.push(currentStepId)
  }
  return { completedStepIds: next, stepId: incomingStepId }
}
