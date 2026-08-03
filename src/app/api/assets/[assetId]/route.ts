import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { assets, projects } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { recordFromJson } from '@/shared/data/json-guards'
import { API_ERROR } from '@/shared/data/constants/api-errors'

async function verifyAssetAccess(assetId: string, userId: string) {
  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId))
  if (!asset) return false

  const [project] = await db.select().from(projects).where(eq(projects.id, asset.projectId))
  if (!project || project.userId !== userId) return false

  return true
}

// GET asset by ID
export async function GET(_request: Request, props: { params: Promise<{ assetId: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { assetId } = params

    if (!(await verifyAssetAccess(assetId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
    }

    const [data] = await db.select().from(assets).where(eq(assets.id, assetId))

    if (!data) {
      return NextResponse.json({ error: API_ERROR.ASSET_NOT_FOUND }, { status: 404 })
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
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { assetId } = params

    if (!(await verifyAssetAccess(assetId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
    }

    const body = await request.json()

    // If updating metadata, merge with existing
    if (body.metadata) {
      const [existing] = await db.select().from(assets).where(eq(assets.id, assetId))

      body.metadata = {
        ...recordFromJson(existing?.metadata),
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
export async function DELETE(_request: Request, props: { params: Promise<{ assetId: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { assetId } = params

    if (!(await verifyAssetAccess(assetId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
    }

    await db.delete(assets).where(eq(assets.id, assetId))

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
