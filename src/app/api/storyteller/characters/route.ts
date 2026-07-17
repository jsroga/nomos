import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { characters } from '@/db'
import { verifyCharacterAccess, verifyProjectAccess } from '@/domains/storyteller/server'
import { eq, desc } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { buildUrl, joinUrlPath } from '@/shared/data/url-builder'
import {
  QueryParam,
  ApiRoutePath,
  AppModuleId,
  HttpMethod,
  HttpStatus,
} from '@/shared/data/constants/protocol'
import { DEFAULT_BASE_URL } from '@/shared/data/constants/url'
import { DB_COLUMN } from '@/shared/data/constants/db-tables'
import { readRowString, recordArrayFromJson, recordFromJson } from '@/shared/data/json-guards'
import './characters-openapi-doc'
import {
  buildCharacterPatchUpdates,
  createCharacterRecord,
} from './characters-mutation-helpers'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get(QueryParam.ProjectId)

  if (!projectId) {
    return NextResponse.json({ error: API_ERROR.PROJECT_ID_IS_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
  }

  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })

    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.FORBIDDEN })
    }

    const result = await db
      .select()
      .from(characters)
      .where(eq(characters.projectId, projectId))
      .orderBy(desc(characters.createdAt))
    return NextResponse.json(result)
  } catch (error) {
    console.error(API_LOG_PREFIX.FAILED_FETCH_CHARACTERS_LOG, error)
    return NextResponse.json({ error: API_ERROR.FAILED_FETCH_CHARACTERS }, { status: HttpStatus.INTERNAL })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })

    const body = await req.json()
    return createCharacterRecord(body, session.user.id)
  } catch (error) {
    console.error(API_LOG_PREFIX.FAILED_CREATE_CHARACTER_LOG, error)
    return NextResponse.json({ error: API_ERROR.FAILED_CREATE_CHARACTER }, { status: HttpStatus.INTERNAL })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })

    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: API_ERROR.CHARACTER_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
    }

    const access = await verifyCharacterAccess(id, session.user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.FORBIDDEN })
    }

    const dbUpdates = buildCharacterPatchUpdates(body)
    const [updatedCharacter] = await db
      .update(characters)
      .set({ ...dbUpdates, updatedAt: new Date() })
      .where(eq(characters.id, id))
      .returning()

    return NextResponse.json(updatedCharacter)
  } catch (error) {
    console.error(API_LOG_PREFIX.FAILED_UPDATE_CHARACTER_LOG, error)
    return NextResponse.json({ error: API_ERROR.FAILED_UPDATE_CHARACTER }, { status: HttpStatus.INTERNAL })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get(QueryParam.Id)

  if (!id) {
    return NextResponse.json({ error: API_ERROR.CHARACTER_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
  }

  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })

    const access = await verifyCharacterAccess(id, session.user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.FORBIDDEN })
    }

    const [character] = await db.select().from(characters).where(eq(characters.id, id))
    await db.delete(characters).where(eq(characters.id, id))

    if (character) {
      try {
        const entitiesResponse = await fetch(
          buildUrl(`${process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_BASE_URL}${ApiRoutePath.Entities}`, {
            [QueryParam.ProjectId]: character.projectId,
            sourceDomain: AppModuleId.Storyteller,
          })
        )
        const entitiesPayload = recordFromJson(await entitiesResponse.json())
        const entities = recordArrayFromJson(entitiesPayload.entities)
        const entity = entities.find(row => readRowString(row, DB_COLUMN.SOURCE_ENTITY_ID) === id)
        const entityId = entity ? readRowString(entity, DB_COLUMN.ID) : undefined

        if (entityId) {
          await fetch(
            joinUrlPath(`${process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_BASE_URL}${ApiRoutePath.Entities}`, entityId),
            { method: HttpMethod.Delete }
          )
        }
      } catch (error) {
        console.error(API_LOG_PREFIX.CHARACTER_ENTITY_DELETE_FAILED, error)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(API_LOG_PREFIX.FAILED_DELETE_CHARACTER_LOG, error)
    return NextResponse.json({ error: API_ERROR.FAILED_DELETE_CHARACTER }, { status: HttpStatus.INTERNAL })
  }
}
