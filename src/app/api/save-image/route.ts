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
    const filePath = path.join(projectDir, filename)
    const fileDir = path.dirname(filePath)

    // Ensure full directory path exists (including subdirectories like 'assets/')
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true })
    }

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
