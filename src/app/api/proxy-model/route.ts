import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/shared/auth/auth'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  ApiErrorMessage,
  CacheControl,
  ContentType,
  ModelFileExtension,
  ProxyAllowedHost,
  QueryParamKey,
} from '@/shared/data/constants/protocol'

const PROXY_ALLOWED_HOSTS = [
  ProxyAllowedHost.AssetsMeshy,
  ProxyAllowedHost.CdnMeshy,
  ProxyAllowedHost.GoogleStorage,
  ProxyAllowedHost.Supabase,
]

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: ApiErrorMessage.UNAUTHORIZED }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get(QueryParamKey.Url)

    if (!url) {
      return NextResponse.json({ error: API_ERROR.MISSING_URL_PARAMETER }, { status: 400 })
    }

    const parsedUrl = new URL(url)
    const isAllowed = PROXY_ALLOWED_HOSTS.some(
      domain => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
    )
    if (!isAllowed) {
      return NextResponse.json({ error: API_ERROR.URL_DOMAIN_NOT_ALLOWED }, { status: 403 })
    }

    const response = await fetch(url)

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch model: ${response.status}` },
        { status: response.status }
      )
    }

    const buffer = await response.arrayBuffer()

    let contentType = ContentType.OctetStream
    if (url.includes(ModelFileExtension.Glb)) contentType = ContentType.GltfBinary
    else if (url.includes(ModelFileExtension.Fbx)) contentType = ContentType.OctetStream
    else if (url.includes(ModelFileExtension.Obj)) contentType = ContentType.PlainText
    else if (url.includes(ModelFileExtension.Usdz)) contentType = ContentType.Usdz

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': CacheControl.PublicMaxAge86400,
      },
    })
  } catch (error: unknown) {
    console.error(API_LOG_PREFIX.PROXY_ERROR, error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
