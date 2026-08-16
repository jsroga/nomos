import { createOpenAI } from '@ai-sdk/openai'
import { openRouterClientConfig } from '@/shared/agent-kernel/models'
import { generateText } from 'ai'
import type { EntityReference } from '@/domains/storyteller/core/entities/entity-references'
import {
  ENTITY_BASE_DESCRIPTION_FAILED_LOG,
  ENTITY_BASE_DESCRIPTION_MODEL,
  ENTITY_BASE_DESCRIPTION_TEMPERATURE,
  EntityBaseDescriptionCopy,
  EntityBaseDescriptionLimit,
  entityBaseDescriptionUserPrompt,
  entityNeedsDescription,
  fallbackEntityDescription,
} from '@/domains/storyteller/services/constants/entity-base-description'

export {
  entityNeedsDescription,
  fallbackEntityDescription,
} from '@/domains/storyteller/services/constants/entity-base-description'

export interface BaseEntityDescriptionRequest {
  name: string
  type: string
  surroundingText?: string | null
  projectId: string
}

export async function generateBaseEntityDescription(
  request: BaseEntityDescriptionRequest
): Promise<string> {
  const name = request.name.slice(0, EntityBaseDescriptionLimit.Name)
  const type = request.type.slice(0, EntityBaseDescriptionLimit.Type)
  const surrounding = (request.surroundingText ?? '').slice(
    0,
    EntityBaseDescriptionLimit.Surrounding
  )

  try {
    const openRouter = openRouterClientConfig()
    const openrouter = createOpenAI({ apiKey: openRouter.apiKey, baseURL: openRouter.baseURL })
    const { text } = await generateText({
      model: openrouter(ENTITY_BASE_DESCRIPTION_MODEL),
      system: EntityBaseDescriptionCopy.System,
      prompt: entityBaseDescriptionUserPrompt(name, type, surrounding),
      maxRetries: 1,
      temperature: ENTITY_BASE_DESCRIPTION_TEMPERATURE,
    })
    const trimmed = text.trim()
    return trimmed || fallbackEntityDescription(name, type)
  } catch (error) {
    console.error(ENTITY_BASE_DESCRIPTION_FAILED_LOG, error)
    return fallbackEntityDescription(name, type)
  }
}

export async function descriptionForNewReference(
  provided: string,
  request: BaseEntityDescriptionRequest
): Promise<string> {
  if (!entityNeedsDescription(provided, request.name)) return provided
  return generateBaseEntityDescription(request)
}

export async function fillMissingEntityDescriptions(
  entities: EntityReference[],
  context: string,
  generate: (request: BaseEntityDescriptionRequest) => Promise<string>,
  persist: (id: string, description: string) => Promise<void>
): Promise<EntityReference[]> {
  return Promise.all(
    entities.map(async entity => {
      if (!entityNeedsDescription(entity.description, entity.name)) return entity
      const description = await generate({
        name: entity.name,
        type: entity.type,
        surroundingText: context,
        projectId: entity.projectId,
      })
      if (!description) return entity
      try {
        await persist(entity.id, description)
      } catch {
        // Generated text is still returned on this resolve.
      }
      return { ...entity, description }
    })
  )
}
