import { createSupabaseRouteClient } from '@/shared/auth/supabase-route-client'
import { AUTH_MESSAGE } from '@/shared/auth/constants/auth-messages'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { forgotPasswordSchema } from '@/shared/auth/validation'
import { getSiteURLFromRequest } from '@/shared/data/url'
import { ValidationError } from 'yup'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Server-side validation
    try {
      await forgotPasswordSchema.validate(body, { abortEarly: false })
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: API_ERROR.VALIDATION_FAILED, errors: error.errors },
          { status: 400 }
        )
      }
      throw error
    }

    const { email } = body

    const cookieStore = await cookies()
    const supabase = createSupabaseRouteClient(cookieStore)

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteURLFromRequest(request.url)}auth/callback?type=recovery`,
    })

    // Always return success to avoid leaking whether email exists
    return NextResponse.json({
      message: AUTH_MESSAGE.PASSWORD_RESET_SENT,
    })
  } catch {
    return NextResponse.json({ error: API_ERROR.INTERNAL_ERROR }, { status: 500 })
  }
}
