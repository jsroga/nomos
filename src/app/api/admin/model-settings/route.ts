/**
 * Admin model-settings API — read/update the per-role model routing saved in
 * Supabase. Admin-gated (isAdminUser via NEXT_PUBLIC_CENTRAL_USERS); writes go
 * through the server connection.
 *
 *   GET    → { settings, roles, options }   (admin only)
 *   PUT    { role, model }                   set a slot
 *   DELETE { role }                          clear a slot (revert to env/default)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/shared/auth/auth'
import { isAdminUser } from '@/shared/auth/admin-users'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import {
  loadModelSettings,
  setModelSetting,
  clearModelSetting,
} from '@/shared/agent-kernel/model-settings'
import {
  MODEL_SETTING_ROLES,
  MODEL_SETTING_ROLE_IDS,
  OPENROUTER_MODEL_OPTIONS,
  OPENROUTER_MODEL_OPTION_IDS,
} from '@/shared/agent-kernel/constants/model-settings'

const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const HTTP_BAD_REQUEST = 400
const ERR_ADMIN_ONLY = 'Admin access required'
const ERR_INVALID_ROLE = 'Unknown model slot'
const ERR_INVALID_MODEL = 'Unknown model id'

interface AdminGate {
  error: NextResponse | null
  userId: string | null
}

async function requireAdmin(): Promise<AdminGate> {
  const { session } = await requireAuth()
  if (!session) {
    return {
      error: NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HTTP_UNAUTHORIZED }),
      userId: null,
    }
  }
  if (!isAdminUser(session.user.email)) {
    return {
      error: NextResponse.json({ error: ERR_ADMIN_ONLY }, { status: HTTP_FORBIDDEN }),
      userId: null,
    }
  }
  return { error: null, userId: session.user.id }
}

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error
  const settings = await loadModelSettings()
  return NextResponse.json({
    settings,
    roles: MODEL_SETTING_ROLES,
    options: OPENROUTER_MODEL_OPTIONS,
  })
}

export async function PUT(request: NextRequest) {
  const { error, userId } = await requireAdmin()
  if (error) return error

  const body = recordFromJson(await request.json())
  const role = readString(body.role)
  const model = readString(body.model)

  if (!role || !MODEL_SETTING_ROLE_IDS.includes(role)) {
    return NextResponse.json({ error: ERR_INVALID_ROLE }, { status: HTTP_BAD_REQUEST })
  }
  if (!model || !OPENROUTER_MODEL_OPTION_IDS.includes(model)) {
    return NextResponse.json({ error: ERR_INVALID_MODEL }, { status: HTTP_BAD_REQUEST })
  }

  await setModelSetting(role, model, userId ?? undefined)
  return NextResponse.json({ ok: true, role, model })
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = recordFromJson(await request.json())
  const role = readString(body.role)
  if (!role || !MODEL_SETTING_ROLE_IDS.includes(role)) {
    return NextResponse.json({ error: ERR_INVALID_ROLE }, { status: HTTP_BAD_REQUEST })
  }

  await clearModelSetting(role)
  return NextResponse.json({ ok: true, role })
}
