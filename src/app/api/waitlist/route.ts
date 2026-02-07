import { NextResponse } from 'next/server'

// Simple waitlist implementation.
// Can be expanded to save to Supabase 'waitlist' table later.
// For now, checks environment variable or logs.

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    // TODO: Connect to Supabase table 'waitlist'
    // For now, we'll mimic success.
    console.log('Waitlist Signup:', email)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Waitlist Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
