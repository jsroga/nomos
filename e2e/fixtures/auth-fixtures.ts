import { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const MISSING_URL_MESSAGE = 'NEXT_PUBLIC_SUPABASE_URL is required for e2e auth'
const MISSING_ADMIN_KEY_MESSAGE = 'SUPABASE_SERVICE_ROLE_KEY is required for e2e auth'
const MISSING_ANON_KEY_MESSAGE = 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required for e2e auth'
const NO_SESSION_MESSAGE = 'No session after sign in'
const CREATE_USER_FAILED_MESSAGE = 'Failed to create e2e user'
const LOCAL_COOKIE_DOMAIN = 'localhost'
const COOKIE_SAME_SITE = 'Lax'
const COOKIE_PATH = '/'
const COOKIE_PREFIX = 'sb-'
const COOKIE_SUFFIX = '-auth-token'

function getCookieDomain(): string {
  const baseUrl = process.env.BASE_URL
  if (!baseUrl) return LOCAL_COOKIE_DOMAIN
  try {
    return new URL(baseUrl).hostname
  } catch {
    return LOCAL_COOKIE_DOMAIN
  }
}

interface EnvVars {
  url: string
  adminKey: string
  anonKey: string
}

function getEnvVars(): EnvVars {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url) throw new Error(MISSING_URL_MESSAGE)
  if (!adminKey) throw new Error(MISSING_ADMIN_KEY_MESSAGE)
  if (!anonKey) throw new Error(MISSING_ANON_KEY_MESSAGE)
  return { url, adminKey, anonKey }
}

function getAuthCookieName(url: string): string {
  const projectRef = new URL(url).hostname.split('.')[0]
  return `${COOKIE_PREFIX}${projectRef}${COOKIE_SUFFIX}`
}

function randomUser(): { email: string; password: string } {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return {
    email: `e2e-${id}@example.com`,
    password: `E2E-${id}-!x9`,
  }
}

export interface AuthenticatedPage {
  page: Page
  userId: string
}

export async function setupAuthenticatedPage(page: Page): Promise<AuthenticatedPage> {
  const { url, adminKey, anonKey } = getEnvVars()
  const adminClient = createClient(url, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const anonClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { email, password } = randomUser()
  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError || !userData.user) throw createError ?? new Error(CREATE_USER_FAILED_MESSAGE)
  const userId = userData.user.id

  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError) throw signInError
  if (!signInData.session) throw new Error(NO_SESSION_MESSAGE)

  const session = signInData.session
  const cookieValue = JSON.stringify([
    session.access_token,
    session.refresh_token,
    session.provider_token ?? null,
    session.provider_refresh_token ?? null,
    session.user.factors ?? null,
  ])

  await page.context().addCookies([
    {
      name: getAuthCookieName(url),
      value: cookieValue,
      domain: getCookieDomain(),
      path: COOKIE_PATH,
      httpOnly: false,
      sameSite: COOKIE_SAME_SITE,
    },
  ])

  return { page, userId }
}
