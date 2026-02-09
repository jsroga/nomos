import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug

  // Security: Prevent directory traversal
  if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
    return new NextResponse('Invalid slug', { status: 400 })
  }

  const filePath = path.join(process.cwd(), 'docs/internal/testing', `${slug}.md`)

  try {
    if (!fs.existsSync(filePath)) {
      return new NextResponse('Document not found', { status: 404 })
    }

    const fileContent = fs.readFileSync(filePath, 'utf8')
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  } catch (error) {
    console.error('Error reading doc file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
