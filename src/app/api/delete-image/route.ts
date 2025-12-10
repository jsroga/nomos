import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: Request) {
  try {
    const { projectId, filename } = await request.json()

    if (!projectId || !filename) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const filePath = path.join(process.cwd(), 'public', 'projects', projectId, filename)

    // Check if file exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return NextResponse.json({ success: true })
    } else {
      // File doesn't exist, but that's okay
      return NextResponse.json({ success: true, message: 'File not found' })
    }
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
  }
}
