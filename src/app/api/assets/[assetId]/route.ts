import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assets, projects } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { getErrorMessage } from '@/lib/error-utils'

export const dynamic = 'force-dynamic'

async function verifyAssetAccess(assetId: string, userId: string) {
  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId))
  if (!asset) return false

  const [project] = await db.select().from(projects).where(eq(projects.id, asset.projectId))
  if (!project || project.userId !== userId) return false

  return true
}

// GET asset by ID
export async function GET(request: Request, props: { params: Promise<{ assetId: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { assetId } = params

    if (!(await verifyAssetAccess(assetId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const [data] = await db.select().from(assets).where(eq(assets.id, assetId))

    if (!data) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

// PATCH to update asset (metadata, model_filename, etc.)
export async function PATCH(request: Request, props: { params: Promise<{ assetId: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { assetId } = params

    if (!(await verifyAssetAccess(assetId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()

    // If updating metadata, merge with existing
    if (body.metadata) {
      const [existing] = await db.select().from(assets).where(eq(assets.id, assetId))

      body.metadata = {
        ...((existing?.metadata as any) || {}),
        ...body.metadata,
      }
    }

    const [data] = await db.update(assets).set(body).where(eq(assets.id, assetId)).returning()

    return NextResponse.json(data)
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

// DELETE asset
export async function DELETE(request: Request, props: { params: Promise<{ assetId: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { assetId } = params

    if (!(await verifyAssetAccess(assetId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await db.delete(assets).where(eq(assets.id, assetId))

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
