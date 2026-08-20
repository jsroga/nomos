import { characters } from '@/db'
import { db } from '@/db/client'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import {
  ActionApiResultType,
  ApiErrorMessage,
  CharacterRole,
  HttpStatus,
} from '@/shared/data/constants/protocol'
import { API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { recordFromJson } from '@/shared/data/deep-merge'
import { CharacterPayloadField } from '../constants/action-request-wire'
import { readSqlId, readStringField } from '../read-payload-fields'
import type { ActionHandler } from '../action-handler-context'

export const handleCreateCharacter: ActionHandler = async (ctx, action) => {
  if (!ctx.projectId) {
    return NextResponse.json(
      { error: ApiErrorMessage.PROJECT_ID_REQUIRED },
      { status: HttpStatus.BAD_REQUEST }
    )
  }

  const payload = action.payload
  const newCharacter = {
    id: uuidv4(),
    projectId: ctx.projectId,
    name: readStringField(payload, CharacterPayloadField.Name),
    role: readStringField(payload, CharacterPayloadField.Role, CharacterRole.SupportingLower),
    description: readStringField(payload, CharacterPayloadField.Description),
    psychology: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.insert(characters).values(newCharacter)

  try {
    const { entityRegistry } = await import('@/domains/storyteller/server')
    const slugName = readStringField(payload, CharacterPayloadField.Name).toLowerCase().replace(/\s+/g, '-')
    await entityRegistry.registerWithId(`char-${slugName}`, {
      name: readStringField(payload, CharacterPayloadField.Name),
      description:
        readStringField(payload, CharacterPayloadField.Description) ||
        readStringField(payload, CharacterPayloadField.Role) ||
        readStringField(payload, CharacterPayloadField.Name),
      metadata: {
        role: payload.role,
        motivation: payload.motivation,
        fatalFlaw: payload.fatalFlaw,
      },
      projectId: ctx.projectId,
      sourceEntityId: newCharacter.id,
    })
    console.log(`✅ [Actions] Registered entity for character: char-${slugName}`)
  } catch (entityErr) {
    console.warn(API_LOG_PREFIX.ACTIONS_ENTITY_REGISTER_FAILED, entityErr)
  }

  return NextResponse.json({
    success: true,
    result: { type: ActionApiResultType.CHARACTER_CREATED, character: newCharacter },
  })
}

export const handleUpdateCharacterProfile: ActionHandler = async (_ctx, action) => {
  const characterId = readSqlId(action.payload[CharacterPayloadField.CharacterId])
  const updates = recordFromJson(action.payload[CharacterPayloadField.Updates])

  await db
    .update(characters)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(characters.id, characterId))

  return NextResponse.json({
    success: true,
    result: { type: ActionApiResultType.CHARACTER_UPDATED, characterId },
  })
}
