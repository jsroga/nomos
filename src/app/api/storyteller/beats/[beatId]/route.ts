import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { beats } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: Request, props: { params: Promise<{ beatId: string }> }) {
  const params = await props.params;
  try {
    const { beatId } = params
    const body = await req.json()

    const [updatedBeat] = await db.update(beats).set(body).where(eq(beats.id, beatId)).returning()

    return NextResponse.json(updatedBeat)
  } catch (error) {
    console.error('Error updating beat:', error)
    return NextResponse.json({ error: 'Failed to update beat' }, { status: 500 })
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ beatId: string }> }) {
  const params = await props.params;
  try {
    const { beatId } = params
    await db.delete(beats).where(eq(beats.id, beatId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting beat:', error)
    return NextResponse.json({ error: 'Failed to delete beat' }, { status: 500 })
  }
}
