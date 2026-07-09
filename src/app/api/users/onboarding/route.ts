import { NextRequest, NextResponse } from 'next/server'
import { OnboardingState, DEFAULT_ONBOARDING_STATE, parseModuleId } from '@/shared/types/onboarding'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { supabaseAdmin } from '@/shared/auth/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { action, moduleId, route, userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get current metadata
    const {
      data: { user },
      error: getError,
    } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (getError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const currentState: OnboardingState = user.user_metadata?.onboarding || {
      ...DEFAULT_ONBOARDING_STATE,
    }

    // Ensure routes object exists
    if (!currentState.routes) {
      currentState.routes = {}
    }

    if (action === 'skipAll') {
      currentState.skipAll = true
    } else if (route && (action === 'complete' || action === 'skip')) {
      // Per-route tracking (preferred)
      if (!currentState.routes[route]) {
        currentState.routes[route] = { completed: false, skipped: false }
      }

      if (action === 'complete') {
        currentState.routes[route].completed = true
      } else {
        currentState.routes[route].skipped = true
      }
    } else if (moduleId && (action === 'complete' || action === 'skip')) {
      const parsedModuleId = parseModuleId(moduleId)
      if (!parsedModuleId) {
        return NextResponse.json({ error: 'Invalid moduleId' }, { status: 400 })
      }
      // Legacy: per-module tracking (for backward compatibility)
      if (!currentState.modules) currentState.modules = { ...DEFAULT_ONBOARDING_STATE.modules }
      if (!currentState.modules[parsedModuleId]) {
        currentState.modules[parsedModuleId] = { completed: false, skipped: false }
      }

      if (action === 'complete') {
        currentState.modules[parsedModuleId].completed = true
      } else {
        currentState.modules[parsedModuleId].skipped = true
      }
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...user.user_metadata,
        onboarding: currentState,
        // Keep legacy field for backward compatibility
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
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const onboarding: OnboardingState = user.user_metadata?.onboarding || DEFAULT_ONBOARDING_STATE

    // Ensure routes object exists for backward compatibility
    if (!onboarding.routes) {
      onboarding.routes = {}
    }

    return NextResponse.json({ onboarding })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
