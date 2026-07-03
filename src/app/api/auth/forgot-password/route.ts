import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { forgotPasswordSchema } from '@/shared/auth/validation'
import { getSiteURL } from '@/lib/url'
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
          { error: 'Validation failed', errors: error.errors },
          { status: 400 }
        )
      }
      throw error
    }

    const { email } = body

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteURL()}auth/callback?type=recovery`,
    })

    // Always return success to avoid leaking whether email exists
    return NextResponse.json({
      message: 'If an account exists with that email, a password reset link has been sent',
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
