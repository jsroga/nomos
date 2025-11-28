import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: Request) {
  try {
    const { projectId, filename, imageData } = await request.json()

    if (!projectId || !filename || !imageData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const projectDir = path.join(process.cwd(), 'public', 'projects', projectId)

    // Ensure directory exists
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    const filePath = path.join(projectDir, filename)

    // Remove data:image/png;base64, prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    fs.writeFileSync(filePath, buffer)

    return NextResponse.json({ success: true, path: `/projects/${projectId}/${filename}` })
  } catch (error) {
    console.error('Error saving image:', error)
    return NextResponse.json({ error: 'Failed to save image' }, { status: 500 })
  }
}
