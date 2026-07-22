/**
 * Admin module-settings API (Track A2) — read/update canvas module overrides
 * (enable, canvas placement, per-module model slot) saved in Supabase. Admin-
 * gated (isAdminUser via NEXT_PUBLIC_CENTRAL_USERS); writes go through the
 * server connection.
 *
 *   GET  → { modules, modelRoleOptions }   (admin only)
 *   PUT  { moduleKey, enabled?, canvasSlot?, modelRole? }   upsert overrides
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/shared/auth/auth'
import { isAdminUser } from '@/shared/auth/admin-users'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { getCanvasModules } from '@/shared/canvas/module-registry'
import {
  loadModuleSettings,
  setModuleSetting,
  getModuleConfig,
  type ModuleSettingUpdate,
} from '@/shared/canvas/module-settings'
import { MODEL_SETTING_ROLES } from '@/shared/agent-kernel/constants/model-settings'

const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const HTTP_BAD_REQUEST = 400
const ERR_ADMIN_ONLY = 'Admin access required'
const ERR_INVALID_MODULE = 'Unknown module key'
const KEY_ENABLED = 'enabled'
const KEY_CANVAS_SLOT = 'canvasSlot'
const KEY_MODEL_ROLE = 'modelRole'

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
  await loadModuleSettings()

  const modules = getCanvasModules().map(def => {
    const resolved = getModuleConfig(def.key)
    return {
      key: def.key,
      label: def.label,
      description: def.description,
      enabled: resolved.enabled,
      canvasSlot: resolved.canvasSlot,
      modelRole: resolved.modelRole ?? '',
    }
  })

  return NextResponse.json({ modules, modelRoleOptions: MODEL_SETTING_ROLES })
}

function readUpdate(body: Record<string, unknown>): ModuleSettingUpdate {
  const update: ModuleSettingUpdate = {}
  if (typeof body[KEY_ENABLED] === 'boolean') update.enabled = body[KEY_ENABLED]
  const canvasSlot = readString(body[KEY_CANVAS_SLOT])
  if (KEY_CANVAS_SLOT in body) update.canvasSlot = canvasSlot ?? null
  const modelRole = readString(body[KEY_MODEL_ROLE])
  if (KEY_MODEL_ROLE in body) update.modelRole = modelRole && modelRole.length > 0 ? modelRole : null
  return update
}

export async function PUT(request: NextRequest) {
  const { error, userId } = await requireAdmin()
  if (error) return error

  const body = recordFromJson(await request.json())
  const moduleKey = readString(body.moduleKey)
  if (!moduleKey || !getCanvasModules().some(def => def.key === moduleKey)) {
    return NextResponse.json({ error: ERR_INVALID_MODULE }, { status: HTTP_BAD_REQUEST })
  }

  const row = await setModuleSetting(moduleKey, readUpdate(body), userId ?? undefined)
  return NextResponse.json({ ok: true, moduleKey, ...row })
}
