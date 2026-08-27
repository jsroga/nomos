/** Wire values for job-run ownership. Keep literals out of owned-run.ts. */

/** Tag prefix stamping a run with the project it belongs to: `project:<uuid>`. */
export const PROJECT_TAG_PREFIX = 'project:'

/** Metadata key some pre-tagging tasks wrote; read only as a fallback. */
export const PROJECT_METADATA_KEY = 'projectId'

/** Fields of a Trigger run that may cross the HTTP boundary. */
export const OWNED_RUN_SUMMARY_KEYS = [
  'id',
  'status',
  'output',
  'error',
  'metadata',
  'createdAt',
  'updatedAt',
  'startedAt',
  'finishedAt',
] as const

export const JOB_ACCESS_MESSAGE = {
  NOT_FOUND: 'Run not found',
  MISSING_PROJECT: 'Cannot trigger a run without a projectId — it would be unreadable',
} as const

/**
 * Why a caller is reading a run with no user session. Every value is a
 * deliberate, reviewable decision — not a path exemption, so it cannot be
 * acquired by moving a file.
 */
export enum SystemRunReason {
  /** A live provider smoke polling the run it just triggered in-process. */
  ProviderSmoke = 'provider-smoke',
}

export const JOB_LOG = {
} as const
