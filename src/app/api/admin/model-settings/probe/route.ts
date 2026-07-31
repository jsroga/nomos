/**
 * Admin model probe (roadmap A1) — "test this model" before saving a slot.
 *
 *   POST { model } → { ok, model, latencyMs, sample? , error? }
 *
 * Admin-gated. Always 200 with `ok: false` on a model failure: the probe result
 * IS the payload, and a non-2xx would make the client conflate "the probe route
 * broke" with "that model id doesn't work".
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/shared/auth/auth'
import { isAdminUser } from '@/shared/auth/admin-users'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { HttpStatus } from '@/shared/data/constants/protocol'
import { probeModel } from '@/shared/agent-kernel/model-probe'
import { ModelProbeError } from '@/shared/agent-kernel/constants/model-probe'

const ERR_ADMIN_ONLY = 'Admin access required'

export async function POST(request: NextRequest) {
  const { session } = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
  }
  if (!isAdminUser(session.user.email)) {
    return NextResponse.json({ error: ERR_ADMIN_ONLY }, { status: HttpStatus.FORBIDDEN })
  }

  const body = recordFromJson(await request.json())
  const model = readString(body.model)
  if (!model) {
    return NextResponse.json(
      { ok: false, model: '', latencyMs: 0, error: ModelProbeError.InvalidId },
      { status: HttpStatus.BAD_REQUEST }
    )
  }

  return NextResponse.json(await probeModel(model))
}
