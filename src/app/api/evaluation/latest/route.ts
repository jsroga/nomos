import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

export async function GET() {
  try {
    const resultsDir = path.resolve(process.cwd(), 'src/evaluation/results')
    const filePath = path.join(resultsDir, 'latest.json')

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'No evaluation results found' }, { status: 404 })
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(fileContent)

    // Try to load E2E data
    const e2ePath = path.join(resultsDir, 'latest-e2e.json')
    if (fs.existsSync(e2ePath)) {
      try {
        const e2eContent = fs.readFileSync(e2ePath, 'utf-8')
        const e2eData = JSON.parse(e2eContent)
        // Append E2E variants to the main list, or store them in a separate field?
        // For simplified frontend compatibility, we'll append them but tag them as 'e2e'
        // However, the frontend expects 'variants'.
        // Let's add an 'e2eVariants' field to the response.
        data.e2eVariants = e2eData.variants
      } catch (e) {
        console.warn('Failed to parse latest-e2e.json', e)
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error reading evaluation results:', error)
    return NextResponse.json({ error: 'Failed to read results' }, { status: 500 })
  }
}
