import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { characters, projects } from '@/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'

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
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { characterId } = params

    if (!(await verifyCharacterAccess(characterId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
    }

    const body = await req.json()

    const [updatedCharacter] = await db
      .update(characters)
      .set(body)
      .where(eq(characters.id, characterId))
      .returning()

    return NextResponse.json(updatedCharacter)
  } catch (error) {
    console.error(API_LOG_PREFIX.CHARACTER_UPDATE_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_UPDATE_CHARACTER }, { status: 500 })
  }
}
