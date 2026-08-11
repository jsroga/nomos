/** Beat draft workflow step ids, critic labels, and runtime wire strings. */

export enum BeatDraftStepId {
  PlanBeat = 'plan-beat',
  DraftScript = 'draft-script',
  Critique = 'critique',
  Revise = 'revise',
}

export enum BeatDraftCriticName {
  Continuity = 'Continuity',
  Prose = 'Prose',
  Stakes = 'Stakes',
}

export enum BeatDraftToolChoice {
  None = 'none',
}

export enum BeatDraftStructuredOutputErrorStrategy {
  Warn = 'warn',
}

export enum BeatDraftWorldBibleSection {
  All = 'all',
}

export enum BeatDraftManageBeatOperation {
  Create = 'create',
}

export enum BeatDraftVerdictAction {
  Approve = 'approve',
  Revise = 'revise',
  Kill = 'kill',
}

export const BEAT_DRAFT_NO_FINDINGS = 'NO FINDINGS.'
export const BEAT_DRAFT_CRITIQUE_JOIN = '\n\n'
export const BEAT_DRAFT_CHARACTERS_JOIN = ', '
export const BEAT_DRAFT_MANAGE_BEAT_COMPLETED = 'manage_beat completed'
/** Cap canon bytes passed into author draft/revise prompts so the model call cannot hang indefinitely. */
export const BEAT_DRAFT_AUTHOR_CANON_CHAR_BUDGET = 6_000
export const BEAT_DRAFT_AUTHOR_CANON_TRUNCATED =
  '\n\n[canon truncated for draft context budget]'
/** Hard ceiling for a single author generate() in the beat-draft pipeline. */
export const BEAT_DRAFT_AUTHOR_GENERATE_TIMEOUT_MS = 240_000
export const BEAT_DRAFT_AUTHOR_CRITIQUES_CHAR_BUDGET = 4_000
export const BEAT_DRAFT_VERDICT_SUSPEND_REASON =
  'Editorial verdict required: approve (revise against critiques), revise (add your note), or kill (discard draft).'
export const BEAT_DRAFT_VERDICT_NOTE_DESC = 'Editorial direction, used when action is revise'
export const BEAT_DRAFT_KILLED_MESSAGE = 'Draft killed by editor — nothing saved.'
