import { StringSeparator } from '@/shared/data/constants/protocol'
import type { ProjectScope } from '@/shared/auth/project-scope'
import type { EntityType } from './entity-registry-reference-id'

interface EntityReferenceForEmbedding {
  id: string
  type: EntityType
  name: string
  description: string
  metadata: Record<string, unknown>
}

export async function generateEntityEmbedding(
  entity: EntityReferenceForEmbedding,
  scope: ProjectScope
): Promise<void> {
  try {
    const { entityGraphService } = await import('./entity-graph-service')

    const metaParts: string[] = []
    const meta = entity.metadata || {}

    if (typeof meta.role === 'string') metaParts.push(`Role: ${meta.role}`)
    if (typeof meta.archetype === 'string') metaParts.push(`Archetype: ${meta.archetype}`)
    if (typeof meta.motivation === 'string') metaParts.push(`Motivation: ${meta.motivation}`)
    if (typeof meta.ideology === 'string') metaParts.push(`Ideology: ${meta.ideology}`)
    if (typeof meta.description === 'string') metaParts.push(meta.description)
    if (typeof meta.powerStructure === 'string') metaParts.push(meta.powerStructure)
    if (meta.goals && Array.isArray(meta.goals)) {
      metaParts.push(`Goals: ${meta.goals.join(StringSeparator.CommaSpace)}`)
    }

    const embeddingContent = [
      `${entity.type}: ${entity.name}`,
      entity.description || '',
      ...metaParts,
    ]
      .filter(Boolean)
      .join(StringSeparator.DotSpace)

    if (embeddingContent.length < 5) return

    const wrote = await entityGraphService.buildEntityEmbedding(entity.id, embeddingContent, scope)
    if (wrote) {
      console.log(`🧠 [EntityRegistry] Generated embedding for ${entity.id}`)
    }
  } catch (err) {
    console.warn(`[EntityRegistry] Embedding failed for ${entity.id}:`, err)
  }
}
