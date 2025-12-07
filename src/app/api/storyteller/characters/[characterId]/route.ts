import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { characters } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: Request, props: { params: Promise<{ characterId: string }> }) {
  const params = await props.params;
  try {
    const { characterId } = params
    const body = await req.json()

    const [updatedCharacter] = await db
      .update(characters)
      .set(body)
      .where(eq(characters.id, characterId))
      .returning()

    return NextResponse.json(updatedCharacter)
  } catch (error) {
    console.error('Error updating character:', error)
    return NextResponse.json({ error: 'Failed to update character' }, { status: 500 })
  }
}
