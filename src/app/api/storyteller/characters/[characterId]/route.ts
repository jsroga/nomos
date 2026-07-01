import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { characters, projects } from '@/domains/storyteller'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

async function verifyCharacterAccess(characterId: string, userId: string) {
  const [character] = await db.select().from(characters).where(eq(characters.id, characterId))
  if (!character) return false

  const [project] = await db.select().from(projects).where(eq(projects.id, character.projectId))
  if (!project || project.userId !== userId) return false

  return true
}

export async function PATCH(req: Request, props: { params: Promise<{ characterId: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { characterId } = params

    if (!(await verifyCharacterAccess(characterId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

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
