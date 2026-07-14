import { NextRequest, NextResponse } from 'next/server'
import { OnboardingState, DEFAULT_ONBOARDING_STATE, parseModuleId } from '@/shared/types/onboarding'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { supabaseAdmin } from '@/shared/auth/supabase-admin'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import {
  OnboardingAction,
  OnboardingQueryParam,
} from '@/shared/types/constants/onboarding'

export async function POST(req: NextRequest) {
  try {
    const { action, moduleId, route, userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: API_ERROR.USER_ID_REQUIRED }, { status: 400 })
    }

    const {
      data: { user },
      error: getError,
    } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (getError || !user) {
      return NextResponse.json({ error: API_ERROR.USER_NOT_FOUND }, { status: 404 })
    }

    const currentState: OnboardingState = user.user_metadata?.onboarding || {
      ...DEFAULT_ONBOARDING_STATE,
    }

    if (!currentState.routes) {
      currentState.routes = {}
    }

    if (action === OnboardingAction.SkipAll) {
      currentState.skipAll = true
    } else if (route && (action === OnboardingAction.Complete || action === OnboardingAction.Skip)) {
      if (!currentState.routes[route]) {
        currentState.routes[route] = { completed: false, skipped: false }
      }

      if (action === OnboardingAction.Complete) {
        currentState.routes[route].completed = true
      } else {
        currentState.routes[route].skipped = true
      }
    } else if (moduleId && (action === OnboardingAction.Complete || action === OnboardingAction.Skip)) {
      const parsedModuleId = parseModuleId(moduleId)
      if (!parsedModuleId) {
        return NextResponse.json({ error: API_ERROR.INVALID_MODULE_ID }, { status: 400 })
      }
      if (!currentState.modules) currentState.modules = { ...DEFAULT_ONBOARDING_STATE.modules }
      if (!currentState.modules[parsedModuleId]) {
        currentState.modules[parsedModuleId] = { completed: false, skipped: false }
      }

      if (action === OnboardingAction.Complete) {
        currentState.modules[parsedModuleId].completed = true
      } else {
        currentState.modules[parsedModuleId].skipped = true
      }
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...user.user_metadata,
        onboarding: currentState,
        onboarding_completed:
          currentState.skipAll ||
          Object.values(currentState.modules).every(m => m.completed || m.skipped),
      },
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, onboarding: currentState })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get(OnboardingQueryParam.UserId)

    if (!userId) {
      return NextResponse.json({ error: API_ERROR.USER_ID_REQUIRED }, { status: 400 })
    }

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (error || !user) {
      return NextResponse.json({ error: API_ERROR.USER_NOT_FOUND }, { status: 404 })
    }

    const onboarding: OnboardingState = user.user_metadata?.onboarding || DEFAULT_ONBOARDING_STATE

    if (!onboarding.routes) {
      onboarding.routes = {}
    }

    return NextResponse.json({ onboarding })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
