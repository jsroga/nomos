/**
 * The nonce at the HTTP edge.
 *
 * Routes refuse rather than mint one: a server-generated nonce is unique per
 * request, so it would make every double-submit a second paid run while looking
 * like the feature was on.
 */
import { NextResponse } from 'next/server'
import { SUBMISSION_NONCE_ERROR } from '@/shared/jobs/constants/submission-nonce'
import { readSubmissionNonce } from '@/shared/jobs/submission-nonce'

/** The request's nonce, or the 400 the caller should return. */
export function requireSubmissionNonce(body: unknown): string | NextResponse {
  const requestId = readSubmissionNonce(body)
  if (requestId) return requestId
  return NextResponse.json({ error: SUBMISSION_NONCE_ERROR.MISSING }, { status: 400 })
}
