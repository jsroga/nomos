/** Fix-inconsistencies workflow step ids and wire strings. */

export enum FixInconsistenciesStepId {
  AssembleCanon = 'assemble-canon',
  StructuralScan = 'structural-scan',
  AgenticScan = 'agentic-scan',
  ProposeFixes = 'propose-fixes',
  EditorialVerdict = 'editorial-verdict',
  ApplyFixes = 'apply-fixes',
}

export enum FixInconsistenciesVerdictAction {
  Apply = 'apply',
  Discard = 'discard',
}

export enum FixInconsistenciesSkipReason {
  Locked = 'locked',
  Unpatchable = 'unpatchable',
  Overlap = 'overlap',
}

export enum FixInconsistenciesToolChoice {
  None = 'none',
}

export const FIX_INCONSISTENCIES_VERDICT_STEP_ID = FixInconsistenciesStepId.EditorialVerdict

export const FIX_INCONSISTENCIES_SUSPEND_REASON =
  'Review findings and proposed patches, then apply all or discard all.'

export const FIX_INCONSISTENCIES_EMPTY_MESSAGE = 'Nothing to check — no episodes or beats in this project.'

export const FIX_INCONSISTENCIES_DISCARDED_MESSAGE = 'Consistency fixes discarded — nothing saved.'

export const FIX_INCONSISTENCIES_APPLIED_MESSAGE = 'Consistency fixes applied.'

export const FIX_INCONSISTENCIES_NO_FINDINGS_MESSAGE = 'No inconsistencies detected.'

export enum FixInconsistenciesRunStatus {
  Suspended = 'suspended',
  Success = 'success',
  Failed = 'failed',
}

export enum FixInconsistenciesSseEvent {
  Started = 'started',
  Step = 'step',
  Suspended = 'suspended',
  Complete = 'complete',
  Error = 'error',
}

export const FIX_INCONSISTENCIES_CANON_CHAR_BUDGET = 12_000
export const FIX_INCONSISTENCIES_CANON_TRUNCATED = '\n[truncated]'

export const FIX_INCONSISTENCIES_SCAN_INSTRUCTIONS =
  'Diagnose continuity only. Quote verbatim. Do not rewrite prose. Set patchable false when a fix would create or delete a beat or card.'

export const FIX_INCONSISTENCIES_PROPOSE_INSTRUCTIONS =
  'Propose patches for existing fields only. Do not create or delete beats, characters, or episodes. before/after must be strings.'

export const FIX_INCONSISTENCIES_WORKFLOW_DESCRIPTION =
  'Scan World Bible and all episodes for continuity issues, propose field patches, suspend for apply-all or discard-all, then cascade-apply.'

export enum FixInconsistenciesFieldPath {
  SetupsPayoffs = 'setupsPayoffs',
}

export enum FixInconsistenciesCanonSection {
  Bible = 'BIBLE',
  Characters = 'CHARACTERS',
  WorldRules = 'WORLD RULES',
  Episode = 'EPISODE',
  Findings = 'FINDINGS',
}

export enum FixInconsistenciesStructuredOutputErrorStrategy {
  Warn = 'warn',
}

export const FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY = '[]'
export const FIX_INCONSISTENCIES_EMPTY_JSON_OBJECT = '{}'
export const FIX_INCONSISTENCIES_UNTITLED_EPISODE = ''
export const FIX_INCONSISTENCIES_PROMPT_JOIN = '\n'

export const FIX_INCONSISTENCIES_LOCKED_SKIP_DETAIL = 'Target is locked and was not patched.'

export const FIX_INCONSISTENCIES_STRUCTURAL_ID_PREFIX = 'structural-'

export const FIX_INCONSISTENCIES_AGENTIC_SCAN_PROMPT =
  'Scan this canon chunk for continuity issues. Return the most severe findings first. Quote the offending passage. Do not propose patches.'

export const FIX_INCONSISTENCIES_PROPOSE_FIXES_PROMPT =
  'Propose field patches for these patchable findings. Existing fields only — do not create or delete beats or cards.'

export enum FixInconsistenciesApiPath {
  Run = '/api/storyteller/consistency/fix-run',
  Resume = '/api/storyteller/consistency/fix-run/resume',
}

export enum FixInconsistenciesSseField {
  EventPrefix = 'event: ',
  DataPrefix = 'data: ',
  BlockJoin = '\n\n',
  LineJoin = '\n',
}

export enum FixInconsistenciesResumeError {
  UnknownAction = 'Unknown action. Expected apply or discard.',
}

export const FIX_INCONSISTENCIES_MAX_DURATION_SECONDS = 300
