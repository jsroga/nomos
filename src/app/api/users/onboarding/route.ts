import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { OnboardingState, DEFAULT_ONBOARDING_STATE, ModuleId } from '@/types/onboarding'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(req: NextRequest) {
  try {
    const { action, moduleId, userId } = await req.json()

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

    if (action === 'skipAll') {
      currentState.skipAll = true
    } else if (moduleId && (action === 'complete' || action === 'skip')) {
      if (!currentState.modules) currentState.modules = { ...DEFAULT_ONBOARDING_STATE.modules }
      if (!currentState.modules[moduleId as ModuleId]) {
        currentState.modules[moduleId as ModuleId] = { completed: false, skipped: false }
      }

      if (action === 'complete') {
        currentState.modules[moduleId as ModuleId].completed = true
      } else {
        currentState.modules[moduleId as ModuleId].skipped = true
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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

    return NextResponse.json({ onboarding })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
