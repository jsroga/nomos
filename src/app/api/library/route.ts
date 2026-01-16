import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { requireAuth } from '@/lib/api-utils'

const MANIFEST_PATH = path.join(process.cwd(), 'public/library/manifest.json')

/**
 * GET /api/library - Fetch the 3D asset library
 */
export async function GET() {
  try {
    const data = await fs.readFile(MANIFEST_PATH, 'utf-8')
    const manifest = JSON.parse(data)
    
    return NextResponse.json(manifest)
  } catch (error) {
    console.error('Error reading library manifest:', error)
    return NextResponse.json(
      { error: 'Failed to load library' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/library - Add a new asset to the library
 * Requires authentication
 */
export async function POST(req: Request) {
  try {
    // Require auth for modifications
    const { session, error } = await requireAuth()
    if (error || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const newAsset = await req.json()
    
    // Validate required fields
    if (!newAsset.id || !newAsset.name || !newAsset.file) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, file' },
        { status: 400 }
      )
    }
    
    // Read current manifest
    const data = await fs.readFile(MANIFEST_PATH, 'utf-8')
    const manifest = JSON.parse(data)
    
    // Check for duplicate
    if (manifest.assets.find((a: any) => a.id === newAsset.id)) {
      return NextResponse.json(
        { error: 'Asset with this ID already exists' },
        { status: 409 }
      )
    }
    
    // Add defaults
    const asset = {
      ...newAsset,
      createdAt: newAsset.createdAt || new Date().toISOString().split('T')[0],
      featured: newAsset.featured || false,
    }
    
    manifest.assets.push(asset)
    
    // Write updated manifest
    await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
    
    return NextResponse.json({ success: true, asset })
  } catch (error) {
    console.error('Error adding to library:', error)
    return NextResponse.json(
      { error: 'Failed to add asset' },
      { status: 500 }
    )
  }
}
