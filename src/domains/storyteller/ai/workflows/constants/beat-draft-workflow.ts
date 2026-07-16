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
export const BEAT_DRAFT_VERDICT_SUSPEND_REASON =
  'Editorial verdict required: approve (revise against critiques), revise (add your note), or kill (discard draft).'
export const BEAT_DRAFT_VERDICT_NOTE_DESC = 'Editorial direction, used when action is revise'
export const BEAT_DRAFT_KILLED_MESSAGE = 'Draft killed by editor — nothing saved.'
