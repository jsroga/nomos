import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  const docsDir = path.resolve(process.cwd(), 'docs')
  const filePath = path.join(docsDir, 'ARCHITECTURE.md')

  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      return new NextResponse(content, {
        headers: { 'Content-Type': 'text/markdown' },
      })
    } else {
      return new NextResponse('Architecture document not found', { status: 404 })
    }
  } catch (error) {
    return new NextResponse('Error reading architecture document', { status: 500 })
  }
}
