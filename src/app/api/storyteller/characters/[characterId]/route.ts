import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/client'
import { characters } from '@/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import { verifyCharacterAccess } from '@/domains/storyteller/server'
import { buildCharacterPatchUpdates } from '@/domains/storyteller/core/character-patch'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { HttpStatus } from '@/shared/data/constants/protocol'

const CharacterPatchBodySchema = z.record(z.unknown())

export async function PATCH(req: Request, props: { params: Promise<{ characterId: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
    }

    const { characterId } = params
    const access = await verifyCharacterAccess(characterId, session.user.id)
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: API_ERROR.ENTITY_NOT_FOUND },
        { status: HttpStatus.NOT_FOUND }
      )
    }

    const body = CharacterPatchBodySchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: API_ERROR.INVALID_PAYLOAD }, { status: HttpStatus.BAD_REQUEST })
    }
    const dbUpdates = buildCharacterPatchUpdates(body.data)
    const [updatedCharacter] = await db
      .update(characters)
      .set(dbUpdates)
      .where(eq(characters.id, characterId))
      .returning()

    return NextResponse.json(updatedCharacter)
  } catch (error) {
    console.error(API_LOG_PREFIX.CHARACTER_UPDATE_ERROR, error)
    return NextResponse.json(
      { error: API_ERROR.FAILED_UPDATE_CHARACTER },
      { status: HttpStatus.INTERNAL }
    )
  }
}
