/** Reasons a caller may act on a project with no user session. */
export enum SystemScopeReason {
  /** Trigger task persisting the work it just performed. */
  TaskPersistence = 'task-persistence',
  /** Background job assembling context for generation. */
  JobContext = 'job-context',
  /** Live provider smoke against a scratch project. */
  ProviderSmoke = 'provider-smoke',
}

export const PROJECT_SCOPE_LOG = {
  SYSTEM_ACQUIRED: '[auth] system scope acquired for project',
} as const

export const PROJECT_FORBIDDEN_MESSAGE = 'Project not found'

/** Description only — the symbol's identity is what matters, not this string. */
export const PROJECT_SCOPE_BRAND_NAME = 'ProjectScope'
