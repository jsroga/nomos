import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: Request) {
  try {
    const { projectId, filename, modelUrl } = await request.json()

    if (!projectId || !filename || !modelUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const projectDir = path.join(process.cwd(), 'public', 'projects', projectId)
    const assetsDir = path.join(projectDir, 'assets')
    const filePath = path.join(assetsDir, filename)

    // Ensure directory exists
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true })
    }

    // Fetch the model file from the remote URL
    const response = await fetch(modelUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch model from URL: ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    fs.writeFileSync(filePath, Buffer.from(buffer))

    return NextResponse.json({ success: true, path: `/projects/${projectId}/assets/${filename}` })
  } catch (error: any) {
    console.error('Error saving model:', error)
    return NextResponse.json({ error: error.message || 'Failed to save model' }, { status: 500 })
  }
}
