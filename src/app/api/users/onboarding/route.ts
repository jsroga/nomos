import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// User-level onboarding API - stores in auth.users user_metadata

export async function POST(req: NextRequest) {
    try {
        const { completed, userId } = await req.json()

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Update user_metadata in auth.users
        const { error } = await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { onboarding_completed: completed }
        })

        if (error) {
            console.error('Failed to update onboarding status:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Onboarding API error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data, error } = await supabase.auth.admin.getUserById(userId)

        if (error) {
            console.error('Failed to get onboarding status:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            onboarding_completed: data?.user?.user_metadata?.onboarding_completed ?? false
        })
    } catch (error: any) {
        console.error('Onboarding API error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
