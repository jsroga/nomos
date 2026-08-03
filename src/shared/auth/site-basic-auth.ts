/**
 * Optional whole-site HTTP Basic Auth gate (proxy). Enabled when
 * BASIC_AUTH_PASSWORD is set — used as a soft public preview lock.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  EnvVarName,
  HttpHeader,
  HttpStatus,
  NodeEnv,
} from '@/shared/data/constants/protocol'

enum BasicAuthWire {
  SchemePrefix = 'Basic ',
  HeaderName = 'authorization',
  WwwAuthenticate = 'WWW-Authenticate',
  RealmValue = 'Basic realm="Nomos"',
  CredentialSeparator = ':',
  UnauthorizedBody = 'Authentication required',
}

function readExpectedPassword(): string {
  return process.env[EnvVarName.BasicAuthPassword]?.trim() ?? ''
}

function readExpectedUser(): string {
  return process.env[EnvVarName.BasicAuthUser]?.trim() ?? ''
}

export function isSiteBasicAuthEnabled(): boolean {
  return readExpectedPassword().length > 0
}

function decodeBasicCredentials(
  header: string,
): { user: string; password: string } | null {
  if (!header.startsWith(BasicAuthWire.SchemePrefix)) return null
  const encoded = header.slice(BasicAuthWire.SchemePrefix.length)
  try {
    const decoded = atob(encoded)
    const sep = decoded.indexOf(BasicAuthWire.CredentialSeparator)
    if (sep < 0) return null
    return {
      user: decoded.slice(0, sep),
      password: decoded.slice(sep + 1),
    }
  } catch {
    return null
  }
}

function isE2eBypass(request: NextRequest): boolean {
  const secret = process.env[EnvVarName.E2eBypassAuthSecret]
  if (!secret) return false
  const nodeEnv = process.env.NODE_ENV
  if (nodeEnv !== NodeEnv.Development && nodeEnv !== NodeEnv.Test) return false
  return request.headers.get(HttpHeader.BYPASS_AUTH) === secret
}

export function isSiteBasicAuthSatisfied(request: NextRequest): boolean {
  if (!isSiteBasicAuthEnabled()) return true
  if (isE2eBypass(request)) return true

  const header = request.headers.get(BasicAuthWire.HeaderName)
  if (!header) return false

  const creds = decodeBasicCredentials(header)
  if (!creds) return false

  const expectedUser = readExpectedUser()
  if (expectedUser && creds.user !== expectedUser) return false

  return creds.password === readExpectedPassword()
}

/** Returns a 401 challenge when basic auth fails; otherwise null. */
export function enforceSiteBasicAuth(request: NextRequest): NextResponse | null {
  if (isSiteBasicAuthSatisfied(request)) return null
  return new NextResponse(BasicAuthWire.UnauthorizedBody, {
    status: HttpStatus.UNAUTHORIZED,
    headers: {
      [BasicAuthWire.WwwAuthenticate]: BasicAuthWire.RealmValue,
    },
  })
}
