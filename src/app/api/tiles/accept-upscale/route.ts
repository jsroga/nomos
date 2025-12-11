import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
    try {
        const { projectId, x, y, upscaledUrl } = await req.json()

        if (!projectId || x === undefined || y === undefined || !upscaledUrl) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Update tile in database with the Vercel Blob URL directly
        // No need to download and re-upload - just store the URL
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Store the full URL (works for both Vercel Blob URLs and local paths)
        const { error } = await supabase
            .from('tiles')
            .update({ image_filename: upscaledUrl })
            .eq('project_id', projectId)
            .eq('x', x)
            .eq('y', y)

        if (error) {
            console.error('Failed to update tile:', error)
            return NextResponse.json(
                { error: 'Failed to update tile in database' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true, filename: upscaledUrl })
    } catch (error: any) {
        console.error('Error accepting upscale:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
