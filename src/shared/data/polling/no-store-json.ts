import { NextResponse } from 'next/server'
import { CacheControl, HttpHeaderName } from '@/shared/data/constants/protocol'

export function noStoreJson(body: unknown, status?: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { [HttpHeaderName.CacheControl]: CacheControl.NoStore },
  })
}
