import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  // Getting Started is the root README.md
  const filePath = path.resolve(process.cwd(), 'README.md')

  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      return new NextResponse(content, {
        headers: { 'Content-Type': 'text/markdown' },
      })
    } else {
      return new NextResponse('Getting Started (README.md) not found', { status: 404 })
    }
  } catch (error) {
    return new NextResponse('Error reading getting started document', { status: 500 })
  }
}
