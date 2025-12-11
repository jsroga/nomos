import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Force dynamic to handle large payloads
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for large file processing

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { projectId, filename, imageData } = body

    if (!projectId || !filename) {
      return NextResponse.json({ error: 'Missing projectId or filename' }, { status: 400 })
    }

    if (!imageData) {
      console.error('[save-image] Missing imageData, received:', { 
        projectId, 
        filename,
        bodyKeys: Object.keys(body),
        imageDataType: typeof imageData,
      })
      return NextResponse.json({ error: 'Missing imageData' }, { status: 400 })
    }

    console.log('[save-image] Saving image:', { 
      projectId, 
      filename, 
      imageDataLength: imageData.length,
      imageDataPreview: imageData.substring(0, 50) + '...'
    })

    const projectDir = path.join(process.cwd(), 'public', 'projects', projectId)
    const filePath = path.join(projectDir, filename)
    const fileDir = path.dirname(filePath)

    // Ensure full directory path exists (including subdirectories like 'assets/')
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true })
    }

    // Remove data:image/png;base64, prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
    
    if (!base64Data || base64Data.length === 0) {
      console.error('[save-image] Empty base64 data after processing')
      return NextResponse.json({ error: 'Empty image data' }, { status: 400 })
    }

    const buffer = Buffer.from(base64Data, 'base64')
    
    if (buffer.length === 0) {
      console.error('[save-image] Empty buffer after base64 decode')
      return NextResponse.json({ error: 'Invalid base64 data' }, { status: 400 })
    }

    console.log('[save-image] Writing file:', { filePath, bufferSize: buffer.length })
    fs.writeFileSync(filePath, buffer)
    
    // Verify file was written
    if (!fs.existsSync(filePath)) {
      console.error('[save-image] File not found after write:', filePath)
      return NextResponse.json({ error: 'File write verification failed' }, { status: 500 })
    }

    const stats = fs.statSync(filePath)
    console.log('[save-image] File saved successfully:', { filePath, size: stats.size })

    return NextResponse.json({ success: true, path: `/projects/${projectId}/${filename}`, size: stats.size })
  } catch (error: any) {
    console.error('[save-image] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to save image' }, { status: 500 })
  }
}
