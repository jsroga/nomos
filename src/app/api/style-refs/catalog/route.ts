import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/shared/auth/auth'
import { isAdminUser } from '@/shared/auth/admin-users'
import { withRateLimit } from '@/shared/data/api-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { HttpStatus, QueryParam } from '@/shared/data/constants/protocol'
import { recordFromJson, readString, stringArrayFromJson } from '@/shared/data/json-guards'
import {
  getModuleConfigRecord,
  loadModuleSettings,
  patchModuleConfig,
} from '@/shared/canvas/module-settings'
import {
  GenerationMode,
  STYLE_REFERENCE_URL_MAX,
  StyleRefCatalogBodyKey,
  catalogIdSet,
  catalogModeFromRaw,
  catalogPayload,
  resolveCatalogEnabledIds,
  styleRefCatalogDef,
  uniqueCatalogIds,
  type StyleRefCatalogDef,
} from '@/domains/2d-canvas/core/io/style-ref-catalog'

function parsePutEnabledIds(
  mode: GenerationMode,
  body: Record<string, unknown>,
): { error: string; ids?: undefined; def?: undefined } | {
  error: null
  ids: string[]
  def: StyleRefCatalogDef
} {
  const def = styleRefCatalogDef(mode)
  if (!def) {
    return { error: API_ERROR.STYLE_REF_CATALOG_INVALID }
  }
  const allowed = catalogIdSet(def.entries)
  const requested = stringArrayFromJson(body[StyleRefCatalogBodyKey.EnabledIds])
  if (requested.some(id => !allowed.has(id))) {
    return { error: API_ERROR.STYLE_REF_CATALOG_INVALID }
  }
  const ids = uniqueCatalogIds(allowed, requested)
  if (ids.length > STYLE_REFERENCE_URL_MAX) {
    return { error: API_ERROR.STYLE_REF_CATALOG_LIMIT }
  }
  return { error: null, ids, def }
}

async function catalogResponse(mode: GenerationMode, canEdit: boolean) {
  const def = styleRefCatalogDef(mode)
  if (!def) {
    return NextResponse.json(
      { error: API_ERROR.STYLE_REF_CATALOG_INVALID },
      { status: HttpStatus.BAD_REQUEST },
    )
  }
  await loadModuleSettings()
  const enabledIds = resolveCatalogEnabledIds(
    catalogIdSet(def.entries),
    def.defaultEnabled,
    getModuleConfigRecord(def.moduleKey),
    def.enabledIdsKey,
  )
  return NextResponse.json(catalogPayload(def.entries, enabledIds, canEdit))
}

async function saveCatalogFromBody(body: Record<string, unknown>, userId: string) {
  const mode = catalogModeFromRaw(readString(body[StyleRefCatalogBodyKey.Mode]))
  if (!mode) {
    return NextResponse.json(
      { error: API_ERROR.STYLE_REF_CATALOG_INVALID },
      { status: HttpStatus.BAD_REQUEST },
    )
  }
  const parsed = parsePutEnabledIds(mode, body)
  if (parsed.error !== null) {
    return NextResponse.json({ error: parsed.error }, { status: HttpStatus.BAD_REQUEST })
  }
  await patchModuleConfig(
    parsed.def.moduleKey,
    { [parsed.def.enabledIdsKey]: parsed.ids },
    userId,
  )
  return catalogResponse(mode, true)
}

export const GET = withRateLimit(async (request: NextRequest) => {
  const { session, error } = await requireAuth()
  if (error || !session) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
  }
  const mode = catalogModeFromRaw(request.nextUrl.searchParams.get(QueryParam.Mode))
  if (!mode) {
    return NextResponse.json(
      { error: API_ERROR.STYLE_REF_CATALOG_INVALID },
      { status: HttpStatus.BAD_REQUEST },
    )
  }
  return catalogResponse(mode, isAdminUser(session.user.email))
})

export const PUT = withRateLimit(async (request: NextRequest) => {
  const { session, error } = await requireAuth()
  if (error || !session) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
  }
  if (!isAdminUser(session.user.email)) {
    return NextResponse.json({ error: API_ERROR.FORBIDDEN }, { status: HttpStatus.FORBIDDEN })
  }

  try {
    return await saveCatalogFromBody(recordFromJson(await request.json()), session.user.id)
  } catch (err) {
    console.error(API_LOG_PREFIX.STYLE_REF_CATALOG_FAILED, err)
    return NextResponse.json(
      { error: API_ERROR.INTERNAL_SERVER_ERROR },
      { status: HttpStatus.INTERNAL },
    )
  }
})
