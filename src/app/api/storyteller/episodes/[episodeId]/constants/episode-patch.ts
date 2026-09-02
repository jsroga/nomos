/**
 * Columns a PATCH caller may write.
 *
 * The handler used to spread `...rest` from the request body straight into
 * `db.update(episodes).set(...)`, so any caller could rewrite `projectId` and
 * move an episode into another tenant's project. An allowlist is the fix, and
 * `id`, `projectId`, `sequence`, `createdAt` and `updatedAt` are deliberately
 * absent from it.
 */
export const EPISODE_PATCH_ALLOWED_COLUMNS = [
  'title',
  'summary',
  'premise',
  'thematicFocus',
  'scriptContent',
  'masterPrompt',
  'currentPhase',
  'status',
  'posterUrl',
  'posterPrompt',
  'storyPlan',
  'planApproved',
  'tenPointsPlan',
] as const

export type EpisodePatchColumn = (typeof EPISODE_PATCH_ALLOWED_COLUMNS)[number]

export enum EpisodePatchAlias {
  EpisodePrompt = 'episode_prompt',
  MasterPromptSnake = 'master_prompt',
}
