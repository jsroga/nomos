import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { gameLoops } from '@/db/schema'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  ApiRoutePath,
  AppModuleId,
  ContentType,
  CrossDomainSuggestionCopy,
  CrossDomainSuggestionType,
  GameEntityKind,
  GameEntityTag,
  HttpMethod,
  HttpStatus,
} from '@/shared/data/constants/protocol'
import { DEFAULT_BASE_URL } from '@/shared/data/constants/url'

interface CreateLoopInput {
  projectId: string
  userId: string
  name: string
  nodes?: unknown
  edges?: unknown
  metadata?: Record<string, unknown> | null
  analysis?: unknown
}

export async function createGameLoopRecord(input: CreateLoopInput) {
  const scope = await tryProjectScope(input.projectId, input.userId)
  if (!scope) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.FORBIDDEN })
  }

  const [newLoop] = await db
    .insert(gameLoops)
    .values({
      projectId: scope.projectId,
      userId: input.userId,
      name: input.name,
      nodes: input.nodes || [],
      edges: input.edges || [],
      metadata: input.metadata || null,
      analysis: input.analysis || null,
    })
    .returning()

  console.log(`✅ Game loop created: ${input.name} (${newLoop.id})`)
  return newLoop
}

export async function createLoopGameEntity(input: {
  projectId: string
  userId: string
  name: string
  loopId: string
  metadata?: Record<string, unknown> | null
}): Promise<string | null> {
  try {
    const entityResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_BASE_URL}${ApiRoutePath.Entities}`,
      {
        method: HttpMethod.Post,
        headers: { 'Content-Type': ContentType.Json },
        body: JSON.stringify({
          projectId: input.projectId,
          userId: input.userId,
          entityType: GameEntityKind.Mechanic,
          name: input.name,
          description: input.metadata?.description || `Game loop: ${input.name}`,
          sourceDomain: AppModuleId.LoopCreator,
          sourceEntityId: input.loopId,
          metadata: {
            loopType: input.metadata?.type,
            ...input.metadata,
          },
          tags: [input.metadata?.type || GameEntityTag.GameLoop].filter(Boolean),
        }),
      }
    )

    if (entityResponse.ok) {
      const { entity } = await entityResponse.json()
      return entity?.id ?? null
    }
  } catch (error) {
    console.error(API_LOG_PREFIX.LOOP_ENTITY_CREATE_FAILED, error)
  }
  return null
}

export function buildLoopCrossDomainSuggestions(input: {
  loopId: string
  projectId: string
  name: string
  entityId: string | null
}) {
  const entityRef = input.entityId || input.loopId
  return [
    {
      id: `loop-to-story-${input.loopId}`,
      type: CrossDomainSuggestionType.CrossDomain,
      title: `Write a story featuring ${input.name}`,
      description: CrossDomainSuggestionCopy.LoopToStoryDescription,
      targetDomain: AppModuleId.Storyteller,
      targetRoute: `/${input.projectId}/storyteller`,
      autoMessage: `Write a scene that demonstrates the @${input.name} mechanic in action. Make it feel exciting and impactful.`,
      priority: 5,
      entityId: entityRef,
    },
    {
      id: `loop-to-level-${input.loopId}`,
      type: CrossDomainSuggestionType.CrossDomain,
      title: `Design a level for ${input.name}`,
      description: CrossDomainSuggestionCopy.LoopToLevelDescription,
      targetDomain: AppModuleId.InteriorDesigner,
      targetRoute: `/${input.projectId}/3d-canvas`,
      priority: 4,
      entityId: entityRef,
    },
  ]
}
