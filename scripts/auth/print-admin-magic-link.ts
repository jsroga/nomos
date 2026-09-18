/**
 * Print a one-time localhost magic URL for Claude Design. Does not send email.
 * npx tsx scripts/auth/print-admin-magic-link.ts --project <uuid> [--path storyteller]
 */
import '../cli-preload'

import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getAdminUsers } from '@/shared/auth/admin-users'
import {
  AUTH_FLOW_TYPE,
  AUTH_QUERY_PARAM,
  AUTH_ROUTE,
} from '@/shared/auth/constants/auth-messages'
import { sanitizeAuthCallbackNext } from '@/shared/auth/utils/auth-callback-next'
import { DEFAULT_BASE_URL } from '@/shared/data/constants/url'
import { appendQueryParams, joinUrlPath } from '@/shared/data/url-builder'

const PROJECT_ID_SCHEMA = z.string().uuid()
const MODULE_PATH_PATTERN = /^[A-Za-z0-9-]+$/
const FLAG_PROJECT = '--project'
const FLAG_PATH = '--path'
const FLAG_EMAIL = '--email'
const USAGE =
  'npx tsx scripts/auth/print-admin-magic-link.ts --project <uuid> [--path storyteller] [--email you@example.com]'

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  if (index < 0) return undefined
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) return undefined
  return value
}

function fail(message: string): never {
  process.stderr.write(`${message}\n${USAGE}\n`)
  process.exit(1)
}

function resolveEmail(): string {
  const fromFlag = readArg(FLAG_EMAIL)
  if (fromFlag) return fromFlag.trim().toLowerCase()
  const admins = getAdminUsers()
  const first = admins[0]
  if (!first) fail('No admin email in NEXT_PUBLIC_CENTRAL_USERS')
  return first
}

function resolveNextPath(projectId: string): string {
  const rawPath = readArg(FLAG_PATH)?.replace(/^\/+/, '') ?? ''
  if (rawPath && !MODULE_PATH_PATTERN.test(rawPath)) {
    fail(`Invalid --path "${rawPath}"`)
  }
  const built = rawPath
    ? joinUrlPath('/', projectId, rawPath)
    : joinUrlPath('/', projectId)
  return sanitizeAuthCallbackNext(built)
}

async function main(): Promise<void> {
  const projectRaw = readArg(FLAG_PROJECT)
  const projectParsed = PROJECT_ID_SCHEMA.safeParse(projectRaw)
  if (!projectParsed.success) fail('--project must be a UUID')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) fail('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')

  const email = resolveEmail()
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase.auth.admin.generateLink({
    type: AUTH_FLOW_TYPE.MAGICLINK,
    email,
  })
  const hashedToken = data?.properties?.hashed_token
  if (error || !hashedToken) {
    fail(error?.message ?? 'generateLink did not return hashed_token')
  }

  const callbackPath = appendQueryParams(`/${AUTH_ROUTE.CALLBACK}`, {
    [AUTH_QUERY_PARAM.TOKEN_HASH]: hashedToken,
    [AUTH_QUERY_PARAM.TYPE]: AUTH_FLOW_TYPE.MAGICLINK,
    [AUTH_QUERY_PARAM.NEXT]: resolveNextPath(projectParsed.data),
  })
  process.stdout.write(`${DEFAULT_BASE_URL}${callbackPath}\n`)
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  fail(message)
})
