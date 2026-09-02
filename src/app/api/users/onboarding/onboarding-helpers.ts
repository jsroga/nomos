import { NextRequest, NextResponse } from 'next/server'
import { OnboardingState, DEFAULT_ONBOARDING_STATE, parseModuleId } from '@/shared/types/onboarding'
import { MODULE_ID_VALUES } from '@/shared/types/constants/onboarding'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { recordFromJson } from '@/shared/data/json-guards'
import { supabaseAdmin } from '@/shared/auth/supabase-admin'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { OnboardingAction } from '@/shared/types/constants/onboarding'

function ensureRoutes(state: OnboardingState): void {
  if (!state.routes) {
    state.routes = {}
  }
}

function applySkipAll(state: OnboardingState): void {
  state.skipAll = true
}

function applyRouteAction(state: OnboardingState, route: string, action: OnboardingAction): void {
  if (!state.routes) state.routes = {}
  if (!state.routes[route]) {
    state.routes[route] = { completed: false, skipped: false }
  }

  if (action === OnboardingAction.Complete) {
    state.routes[route].completed = true
  } else {
    state.routes[route].skipped = true
  }
}

function applyModuleAction(
  state: OnboardingState,
  moduleId: string,
  action: OnboardingAction
): NextResponse | null {
  const parsedModuleId = parseModuleId(moduleId)
  if (!parsedModuleId) {
    return NextResponse.json({ error: API_ERROR.INVALID_MODULE_ID }, { status: 400 })
  }

  if (!state.modules) state.modules = { ...DEFAULT_ONBOARDING_STATE.modules }
  if (!state.modules[parsedModuleId]) {
    state.modules[parsedModuleId] = { completed: false, skipped: false }
  }

  if (action === OnboardingAction.Complete) {
    state.modules[parsedModuleId].completed = true
  } else {
    state.modules[parsedModuleId].skipped = true
  }

  return null
}

export function applyOnboardingAction(
  state: OnboardingState,
  input: {
    action: OnboardingAction
    moduleId?: string
    route?: string
  }
): NextResponse | null {
  ensureRoutes(state)

  if (input.action === OnboardingAction.SkipAll) {
    applySkipAll(state)
    return null
  }

  if (
    input.route &&
    (input.action === OnboardingAction.Complete || input.action === OnboardingAction.Skip)
  ) {
    applyRouteAction(state, input.route, input.action)
    return null
  }

  if (
    input.moduleId &&
    (input.action === OnboardingAction.Complete || input.action === OnboardingAction.Skip)
  ) {
    return applyModuleAction(state, input.moduleId, input.action)
  }

  return null
}

export async function persistOnboardingState(
  userId: string,
  userMetadata: Record<string, unknown> | undefined,
  currentState: OnboardingState
): Promise<NextResponse | { onboarding: OnboardingState }> {
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...userMetadata,
      onboarding: currentState,
      onboarding_completed:
        currentState.skipAll ||
        Object.values(currentState.modules).every(m => m.completed || m.skipped),
    },
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return { onboarding: currentState }
}

export async function loadOnboardingUser(userId: string) {
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.admin.getUserById(userId)

  if (error || !user) {
    return NextResponse.json({ error: API_ERROR.USER_NOT_FOUND }, { status: 404 })
  }

  return user
}

function readModuleOnboardingState(value: unknown): { completed: boolean; skipped: boolean } {
  const record = recordFromJson(value)
  return {
    completed: record.completed === true,
    skipped: record.skipped === true,
  }
}

function readOnboardingStateFromMetadata(value: unknown): OnboardingState {
  const record = recordFromJson(value)
  const modules = { ...DEFAULT_ONBOARDING_STATE.modules }

  for (const moduleId of MODULE_ID_VALUES) {
    const moduleState = recordFromJson(record.modules)[moduleId]
    if (moduleState !== undefined) {
      modules[moduleId] = readModuleOnboardingState(moduleState)
    }
  }

  const routes: OnboardingState['routes'] = {}
  for (const [route, routeState] of Object.entries(recordFromJson(record.routes))) {
    routes[route] = readModuleOnboardingState(routeState)
  }

  return {
    skipAll: record.skipAll === true,
    modules,
    routes,
  }
}

export function readOnboardingState(user: { user_metadata?: Record<string, unknown> }): OnboardingState {
  const rawOnboarding = user.user_metadata?.onboarding
  if (rawOnboarding === undefined) {
    return { ...DEFAULT_ONBOARDING_STATE, routes: {} }
  }

  return readOnboardingStateFromMetadata(rawOnboarding)
}

/** `userId` is the session's user — never a value taken from the request. */
export async function handleOnboardingPost(
  req: NextRequest,
  userId: string
): Promise<NextResponse> {
  try {
    const { action, moduleId, route } = await req.json()

    const userResult = await loadOnboardingUser(userId)
    if (userResult instanceof NextResponse) return userResult

    const currentState = readOnboardingState(userResult)
    const actionError = applyOnboardingAction(currentState, { action, moduleId, route })
    if (actionError) return actionError

    const persistResult = await persistOnboardingState(
      userId,
      userResult.user_metadata,
      currentState
    )
    if (persistResult instanceof NextResponse) return persistResult

    return NextResponse.json({ success: true, onboarding: persistResult.onboarding })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/** `userId` is the session's user — never a value taken from the request. */
export async function handleOnboardingGet(userId: string): Promise<NextResponse> {
  try {
    const userResult = await loadOnboardingUser(userId)
    if (userResult instanceof NextResponse) return userResult

    return NextResponse.json({ onboarding: readOnboardingState(userResult) })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
