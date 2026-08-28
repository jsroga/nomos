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
  MISSING_NONCE: 'Cannot trigger a run without a requestId — a double-submit would buy twice',
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

/**
 * How long a replayed submission still collapses into the original run.
 *
 * The nonce is minted per user action, so this bounds only replays of *that*
 * action — a retried request, a tab left open. An hour covers both without
 * pinning keys indefinitely.
 */
export const SUBMISSION_IDEMPOTENCY_TTL = '1h'
