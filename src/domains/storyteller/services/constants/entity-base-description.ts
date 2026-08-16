import { TEXT_GEN_FAST_MODEL } from '@/shared/agent-kernel/models'

export const ENTITY_BASE_DESCRIPTION_MODEL = TEXT_GEN_FAST_MODEL

export const ENTITY_BASE_DESCRIPTION_FAILED_LOG =
  '[EntityBaseDescription] Generation failed:'

export enum EntityBaseDescriptionLimit {
  Name = 200,
  Type = 50,
  Surrounding = 500,
}

export const ENTITY_BASE_DESCRIPTION_TEMPERATURE = 0.3

export enum EntityBaseDescriptionCopy {
  System = `You write brief canon descriptions of story entities for hover tooltips.
Rules:
- Maximum 2 sentences
- Name the entity and what it is in this world
- Atmospheric and concrete
- Never say there is not enough information`,
  NoSurrounding = 'No surrounding sentence.',
}

export function entityBaseDescriptionUserPrompt(
  name: string,
  type: string,
  surrounding: string
): string {
  return `Entity: ${name} (${type})
Surrounding sentence: "${surrounding || EntityBaseDescriptionCopy.NoSurrounding}"

Write a 1-2 sentence description of ${name}:`
}

export function fallbackEntityDescription(name: string, type: string): string {
  return `${name} (${type})`
}

export { entityNeedsDescription } from '@/domains/storyteller/services/constants/entity-needs-description'

export const ENTITY_RESOLVE_MIN_CONTEXT_LENGTH = 10

export function hasUsefulResolveContext(context: string | null): boolean {
  return Boolean(context && context.length > ENTITY_RESOLVE_MIN_CONTEXT_LENGTH)
}
