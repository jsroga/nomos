/** Copy for the editorial verdict card (SSE frame + assistant-ui). */

export enum BeatDraftVerdictCopy {
  AgentName = 'Storyteller',
  Question = 'The draft and critiques are ready. What is your editorial verdict?',
  ApproveLabel = 'Approve',
  ApproveDescription = 'Revise against the critiques as-is',
  ApprovePromoteLabel = 'Approve and promote',
  ApprovePromoteDescription = 'Approve, and persist the editor note as a project world rule',
  ReviseLabel = 'Revise with note',
  ReviseDescription = 'Add editorial direction (it outranks the critics)',
  KillLabel = 'Kill',
  KillDescription = 'Discard the draft entirely — nothing is saved',
  Context = 'Beat-draft pipeline paused at the editorial verdict.',
}

export const BEAT_DRAFT_VERDICT_BLOCK_JOIN = '\n\n'
export const BEAT_DRAFT_VERDICT_QUESTION_ID_PREFIX = 'q-editorial-verdict-'
