/**
 * GET /api/settings/models — model-routing readout (PLAN-V2 1.5).
 *
 * The role→model table with provenance ("author → moonshotai/kimi-k2.7-code
 * (default)", "planner → … (STORYTELLER_PLANNER_MODEL)"). Secret sauce —
 * inspectable by operators only: available outside production, or with the
 * INTERNAL_DOCS_SECRET header in production. API keys never leave the server
 * (endpoint-object models are reported as url + id only).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/shared/data/api-utils'
import {
  ROLE_ENV_VARS,
  resolveRoleModel,
  type StorytellerModelRole,
} from '@/domains/storyteller/config/constants/model-config'

// Node.js Runtime required for Mastra core dependencies
// eslint-disable-next-line local/no-magic-string -- Next.js segment config must be a statically analyzable literal (user-approved exception, 2026-07-09)
export const runtime = 'nodejs'

const INTERNAL_SECRET_HEADER = 'x-internal-secret'
const ERR_UNAUTHORIZED = 'Unauthorized'
const ERR_NOT_AVAILABLE = 'Not available'
const SOURCE_ENV = 'env'
const SOURCE_DEFAULT = 'default'
const PRODUCTION_ENV = 'production'
const RESOLUTION_FAILED_PREFIX = 'unresolvable: '

interface RoleRouting {
  role: StorytellerModelRole
  /** Gateway string, or endpoint form rendered as `url → id` (never the key). */
  model: string
  source: string
  envVar: string
}

function describeResolvedModel(role: StorytellerModelRole): string {
  try {
    const resolved = resolveRoleModel(role)
    if (typeof resolved === 'string') return resolved
    return `${resolved.url} → ${resolved.id}`
  } catch (error) {
    // e.g. endpoint model with its env key missing — report, don't crash.
    return `${RESOLUTION_FAILED_PREFIX}${error instanceof Error ? error.message : String(error)}`
  }
}

function isOperatorRequest(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== PRODUCTION_ENV) return true
  const secret = process.env.INTERNAL_DOCS_SECRET
  return Boolean(secret && request.headers.get(INTERNAL_SECRET_HEADER) === secret)
}

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) {
    return NextResponse.json({ error: ERR_UNAUTHORIZED }, { status: 401 })
  }
  if (!isOperatorRequest(request)) {
    return NextResponse.json({ error: ERR_NOT_AVAILABLE }, { status: 404 })
  }

  const roles = Object.keys(ROLE_ENV_VARS)
  const routing: RoleRouting[] = []
  for (const role of roles) {
    if (!isStorytellerRole(role)) continue
    const envVar = ROLE_ENV_VARS[role]
    routing.push({
      role,
      model: describeResolvedModel(role),
      source: process.env[envVar] ? SOURCE_ENV : SOURCE_DEFAULT,
      envVar,
    })
  }

  return NextResponse.json({ routing })
}

function isStorytellerRole(value: string): value is StorytellerModelRole {
  return value in ROLE_ENV_VARS
}
