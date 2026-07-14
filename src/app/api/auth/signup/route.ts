import { createSupabaseRouteClient } from '@/shared/auth/supabase-route-client'
import { AUTH_MESSAGE } from '@/shared/auth/constants/auth-messages'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { signUpSchema } from '@/shared/auth/validation'
import { getSiteURLFromRequest } from '@/shared/data/url'
import { ValidationError } from 'yup'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Server-side validation
    try {
      await signUpSchema.validate(body, { abortEarly: false })
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: API_ERROR.VALIDATION_FAILED, errors: error.errors },
          { status: 400 }
        )
      }
      throw error
    }

    const { email, password } = body

    const cookieStore = await cookies()
    const supabase = createSupabaseRouteClient(cookieStore)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getSiteURLFromRequest(request.url)}auth/callback`,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      message: AUTH_MESSAGE.CHECK_EMAIL,
      user: data.user,
    })
  } catch {
    return NextResponse.json({ error: API_ERROR.INTERNAL_ERROR }, { status: 500 })
  }
}
