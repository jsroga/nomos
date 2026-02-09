import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const slug = params.slug

  // Validate slug to prevent path traversal
  if (/[^a-zA-Z0-9_-]/.test(slug)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const docsDir = path.resolve(process.cwd(), 'docs/modules')
  const filePath = path.join(docsDir, `${slug}.md`)

  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      return new NextResponse(content, {
        headers: { 'Content-Type': 'text/markdown' },
      })
    } else {
      return new NextResponse('Document not found', { status: 404 })
    }
  } catch (error) {
    return new NextResponse('Error reading document', { status: 500 })
  }
}
