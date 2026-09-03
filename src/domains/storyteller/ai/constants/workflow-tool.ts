/** Beat draft workflow tool wire strings. */

export const RUN_BEAT_DRAFT_PROJECT_ID_DESC =
  'Project ID — normally supplied by the authenticated request context'
export const RUN_BEAT_DRAFT_EPISODE_ID_DESC =
  'Episode ID — normally supplied by the authenticated request context'
export const RUN_BEAT_DRAFT_CHARACTERS_DESC = 'Character names available for this beat'
export const RUN_BEAT_DRAFT_AUTO_APPROVE_DESC =
  'Skip the human verdict gate (batch mode). Default false.'
export const RUN_BEAT_DRAFT_WILDCARDS_DESC =
  'Run the Muse brainstorm→rank stage and feed surviving sparks to the planner. Default off.'

export const RUN_BEAT_DRAFT_TOOL_DESCRIPTION =
  'Draft a story beat through the full GRRM quality pipeline: beat plan → script-format draft → three narrow critics → HUMAN VERDICT (the run pauses for approval) → revision. Use this whenever the user asks to write, draft, or generate a story beat or scene.'

export const RUN_BEAT_DRAFT_MISSING_IDS_MESSAGE =
  'projectId and episodeId are required (from the request context or tool input) to run the beat pipeline'

export const RUN_BEAT_DRAFT_VERDICT_DEFAULT_REASON =
  'Draft and critiques are ready — awaiting the editorial verdict (approve / revise / kill).'

export const RUN_BEAT_DRAFT_PLAN_WARNING_PREFIX =
  'Plan concreteness warnings (planner failed the retry): '

export const RUN_BEAT_DRAFT_PLAN_WARNING_SEPARATOR = ' | '

export const RUN_BEAT_DRAFT_KILLED_MESSAGE = 'Draft killed by editor — nothing saved.'
export const RUN_BEAT_DRAFT_SAVED_SUFFIX = ' and saved'

export enum BeatDraftWorkflowStatus {
  Suspended = 'suspended',
  Completed = 'completed',
  Failed = 'failed',
  Success = 'success',
}

export enum BeatDraftWorkflowFailurePrefix {
  NotRegistered = 'Workflow',
  EndedWithStatus = 'Workflow ended with status',
  ExecuteFailed = 'beat-draft-workflow failed:',
}
