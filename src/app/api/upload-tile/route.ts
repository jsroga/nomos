import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { projectId, x, y, imageBase64, prompt } = await request.json()

    if (!projectId || x === undefined || y === undefined || !imageBase64) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, x, y, imageBase64' },
        { status: 400 }
      )
    }

    // Generate filename
    const filename = `${x}_${y}_${Date.now()}.png`

    // Ensure project directory exists
    const projectDir = path.join(process.cwd(), 'public', 'projects', projectId)
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

    // Save image to filesystem
    const buffer = Buffer.from(base64Data, 'base64')
    const filePath = path.join(projectDir, filename)
    fs.writeFileSync(filePath, buffer)

    // Update database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase
      .from('tiles')
      .upsert(
        {
          project_id: projectId,
          x,
          y,
          tile_prompt: prompt || `Uploaded tile at (${x}, ${y})`,
          image_filename: filename,
        },
        { onConflict: 'project_id,x,y' }
      )
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      filename,
      imageUrl: `/projects/${projectId}/${filename}`,
      tile: data,
    })
  } catch (error: unknown) {
    console.error('Upload tile error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
