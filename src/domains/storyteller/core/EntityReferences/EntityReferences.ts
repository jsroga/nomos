export type EntityType = 'character' | 'place' | 'event' | 'faction' | 'rule' | 'beat' | 'episode'

export interface EntityRelationship {
  targetId: string
  targetName: string
  targetType: EntityType
  relationshipType: string
  strength: number
  description?: string
}

export interface EntityReference {
  id: string
  type: EntityType
  name: string
  description: string
  metadata: Record<string, unknown>
  projectId: string
  sourceEntityId?: string
  createdAt: Date
  lastReferencedAt: Date
  relationships?: EntityRelationship[]
  relationshipSummary?: string
  contextualSummary?: string
}
