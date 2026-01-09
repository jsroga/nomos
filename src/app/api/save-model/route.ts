import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: Request) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, filename, modelUrl } = await request.json()

    if (!projectId || !filename || !modelUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Security Check: Ensure user owns the project
    const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
    if (!project.length || project[0].userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied to project' }, { status: 403 })
    }

    // Security Check: Path Traversal prevention
    // Ensure filename does not contain slashes
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    // Security Check: SSRF Prevention (Basic)
    // Ensure URL is http/https
    const parsedUrl = new URL(modelUrl)
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 })
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
