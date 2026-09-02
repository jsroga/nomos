/** Wire values for the submission nonce. */

/** Body field carrying the client's per-action nonce. */
export const SUBMISSION_NONCE_FIELD = 'requestId'

export const SUBMISSION_NONCE_ERROR = {
  MISSING: 'requestId is required — it is what makes a double-submit one run',
} as const
