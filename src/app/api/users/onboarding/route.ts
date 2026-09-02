import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { HttpStatus } from '@/shared/data/constants/protocol'
import { handleOnboardingGet, handleOnboardingPost } from './onboarding-helpers'

/**
 * Onboarding state is per-user and written with the service-role client, so the
 * user id must come from the session. It used to be read from the request body
 * and query string, which let an unauthenticated caller rewrite any account's
 * metadata.
 */
export async function POST(req: NextRequest) {
  const { session } = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
  }
  return handleOnboardingPost(req, session.user.id)
}

export async function GET(_req: NextRequest) {
  const { session } = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
  }
  return handleOnboardingGet(session.user.id)
}
