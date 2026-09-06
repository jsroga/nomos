/** Beat draft workflow step ids, critic labels, and runtime wire strings. */

import { CHAT_AUTHOR_GENERATE_TIMEOUT_MS } from '@/shared/chat/core/constants/chat-timeouts'

export enum BeatDraftStepId {
  PlanBeat = 'plan-beat',
  DraftScript = 'draft-script',
  ProseCheck = 'prose-check',
  Critique = 'critique',
  Revise = 'revise',
}

export enum BeatDraftCriticName {
  Continuity = 'Continuity',
  Prose = 'Prose',
  Stakes = 'Stakes',
  Dialogue = 'Dialogue',
}

export enum BeatDraftLintReportName {
  ProseCheck = 'ProseCheck',
}

export const BEAT_DRAFT_CRITIC_ROLES = [
  BeatDraftCriticName.Continuity,
  BeatDraftCriticName.Prose,
  BeatDraftCriticName.Stakes,
] as const

export enum LintRedraftMax {
  Value = 1,
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

export enum BeatDraftCanonHeading {
  RoadmapSlot = 'ROADMAP SLOT (high-level brief for this episode — expand, do not contradict):',
}

export const BEAT_DRAFT_NO_FINDINGS = 'NO FINDINGS.'
export const BEAT_DRAFT_CRITIQUE_JOIN = '\n\n'
export const BEAT_DRAFT_CHARACTERS_JOIN = ', '
export const BEAT_DRAFT_MANAGE_BEAT_COMPLETED = 'manage_beat completed'
/** Cap canon bytes passed into author draft/revise prompts so the model call cannot hang indefinitely. */
export const BEAT_DRAFT_AUTHOR_CANON_CHAR_BUDGET = 6_000
/** Cap for delimited masterPrompt voice/register block (same family as author canon budget). */
export const MASTER_PROMPT_CHAR_BUDGET = 6_000
export const BEAT_DRAFT_AUTHOR_CANON_TRUNCATED =
  '\n\n[canon truncated for draft context budget]'
export const BEAT_DRAFT_AUTHOR_CRITIQUES_CHAR_BUDGET = 4_000
/** Hard ceiling for a single author generate() in the beat-draft pipeline. */
export const BEAT_DRAFT_AUTHOR_GENERATE_TIMEOUT_MS = CHAT_AUTHOR_GENERATE_TIMEOUT_MS
export const BEAT_DRAFT_VERDICT_SUSPEND_REASON =
  'Editorial verdict required: approve (revise against critiques), revise (add your note), or kill (discard draft).'
export const BEAT_DRAFT_VERDICT_NOTE_DESC = 'Editorial direction, used when action is revise'
export const BEAT_DRAFT_KILLED_MESSAGE = 'Draft killed by editor — nothing saved.'
export const BEAT_DRAFT_CLAIM_CHECK_FAIL_MESSAGE =
  'Claim-check failed — draft not persisted.'

export enum BeatDraftHumanizerFs {
  SkillsDir = 'skills',
  SkillId = 'humanizer',
  SkillFile = 'SKILL.md',
}

export enum BeatDraftHumanizerCopy {
  NoAcceptedBeats = '(no accepted beats yet)',
  SampleHeader = 'WRITING SAMPLE (accepted beats for register):',
  SourceHeader = 'SOURCE DRAFT TO HUMANIZE:',
  Instruction =
    'Apply only the always-on Humanizer class. Preserve every quote, number, and date. Output the full script beat only.',
}

export enum BeatDraftHumanizerSample {
  MaxBeats = 3,
}

export enum BeatDraftStyleFidelity {
  Detail = 'style_fidelity',
  PromptPrefix =
    'STYLE FIDELITY — judge only the revise paragraph diff below. Voice match without new plot. Do not block persist.',
}
