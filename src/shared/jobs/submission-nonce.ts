/**
 * The submission nonce — what makes two triggers the same run.
 *
 * The key is deliberately *not* derived from prompt content. Regenerating with
 * the same prompt is expected to return a different image, so a content hash
 * would silently hand back the previous one and look like a broken button.
 *
 * Instead the client mints one nonce per user *intent* and reuses it while that
 * submission is in flight: a double-click collapses into one run, a deliberate
 * re-roll after the first settles gets a new nonce and a new run.
 *
 * Client code imports this module directly rather than the `@/shared/jobs`
 * barrel — the barrel reaches Trigger's SDK and the database client, and a
 * component that pulls those in fails the browser build.
 */
import { z } from 'zod'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import {
  SUBMISSION_NONCE_ERROR,
  SUBMISSION_NONCE_FIELD,
} from '@/shared/jobs/constants/submission-nonce'

/** The nonce field, shared by request DTOs and task payload schemas. */
export const submissionNonceSchema = z.string().min(1, SUBMISSION_NONCE_ERROR.MISSING)

/**
 * What every task payload carries, as a schema fragment. Spread it into a
 * task's own shape so the two required fields are declared once.
 */
export const OWNED_PAYLOAD_SHAPE = {
  projectId: z.string().uuid(),
  requestId: submissionNonceSchema,
}

/**
 * A request as the caller supplies it — the nonce is minted at the boundary
 * that knows the user's intent, not passed down from the component.
 */
export type Submitted<T> = Omit<T, typeof SUBMISSION_NONCE_FIELD>

/** Nonces held for intents with a submission still in flight. */
const inFlight = new Map<string, string>()

export function newSubmissionNonce(): string {
  return crypto.randomUUID()
}

/**
 * Run `submit` under the nonce for `intent`, minting one if none is in flight.
 *
 * `intent` identifies what the user is acting on — the task and its target, not
 * the component. A key that varies per render defeats the whole mechanism.
 */
export async function withSubmissionNonce<T>(
  intent: string,
  submit: (requestId: string) => Promise<T>
): Promise<T> {
  const pending = inFlight.get(intent)
  const requestId = pending ?? newSubmissionNonce()
  if (!pending) inFlight.set(intent, requestId)
  try {
    return await submit(requestId)
  } finally {
    if (!pending) inFlight.delete(intent)
  }
}

/** The nonce a request carries, or null — routes answer 400 rather than guess. */
export function readSubmissionNonce(body: unknown): string | null {
  return readString(recordFromJson(body)[SUBMISSION_NONCE_FIELD]) ?? null
}
