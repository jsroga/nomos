import { createSupabaseRouteClient } from '@/shared/auth/supabase-route-client'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { signInSchema } from '@/shared/auth/validation'
import { ValidationError } from 'yup'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Server-side validation
    try {
      await signInSchema.validate(body, { abortEarly: false })
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    return NextResponse.json({
      user: data.user,
      session: data.session,
    })
  } catch {
    return NextResponse.json({ error: API_ERROR.INTERNAL_ERROR }, { status: 500 })
  }
}
