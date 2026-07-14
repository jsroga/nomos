import { NextResponse } from 'next/server'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'

// Simple waitlist implementation.
// Can be expanded to save to Supabase 'waitlist' table later.
// For now, checks environment variable or logs.

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: API_ERROR.INVALID_EMAIL }, { status: 400 })
    }

    // TODO: Connect to Supabase table 'waitlist'
    // For now, we'll mimic success.
    console.log(API_LOG_PREFIX.WAITLIST_SIGNUP, email)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(API_LOG_PREFIX.WAITLIST_ERROR, error)
    return NextResponse.json({ error: API_ERROR.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}
