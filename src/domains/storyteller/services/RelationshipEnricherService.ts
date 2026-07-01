/**
 * Relationship Enricher Service
 *
 * Generates relationship summaries for entities using the character relationship matrix.
 * Provides enriched descriptions with entity references for tooltips.
 */

import { db } from '@/lib/db'
import { projects } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { EntityType } from './EntityRegistryService'
import { entityGraphService } from './EntityGraphService'

// ==========================================
// TYPES
// ==========================================

export type RelationshipType =
  | 'ally'
  | 'enemy'
  | 'rival'
  | 'mentor'
  | 'student'
  | 'lover'
  | 'family'
  | 'stranger'
  | 'acquaintance'
  | 'complex'
  | 'member_of'
  | 'leader_of'
  | 'associated'
  | 'related'
  | 'owns'
  | 'uses'
  | 'caused_by'
  | 'happened_at'
  | 'located_in'
  | 'temporal'

export interface Relationship {
  targetId: string
  targetName: string
  targetType: EntityType
  relationshipType: RelationshipType
  strength: number // 0-1
  description?: string
  confidence?: number
  evidence?: string
  notes?: string
  sinceBeatId?: string
  untilBeatId?: string
  episodeId?: string
}

export interface EnrichedEntity {
  id: string
  name: string
  type: EntityType
  description: string
  relationships: Relationship[]
  /** Formatted relationship summary with entity references */
  relationshipSummary: string
}

interface CharacterData {
  id: string
  name: string
  role?: string
  motivation?: string
  fatalFlaw?: string
  shortDescription?: string
}

interface FactionData {
  name: string
  ideology?: string
  goals?: string[]
  rivals?: string[]
  members?: string[]
  keyMembers?: string[]
}

// Cache for enriched entities
const enrichmentCache = new Map<string, { data: EnrichedEntity; timestamp: number }>()
const CACHE_TTL = 60000 // 1 minute

// ==========================================
// RELATIONSHIP ENRICHER SERVICE
// ==========================================

class RelationshipEnricherService {
  /**
   * Enrich an entity with relationship information
   */
  async enrichEntity(
    entityId: string,
    entityType: EntityType,
    entityName: string,
    projectId: string,
    baseDescription: string = ''
  ): Promise<EnrichedEntity> {
    // Check cache
    const cacheKey = `${projectId}:${entityId}`
    const cached = enrichmentCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }

    try {
      // Get project data for context
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)

      if (!project) {
        return this.createBasicEnriched(entityId, entityType, entityName, baseDescription)
      }

      const storyPlan = (project.storyPlan as Record<string, unknown>) || {}
      const cast = (project.cast as CharacterData[]) || []

      // Build relationships based on entity type
      let relationships: Relationship[] = []

      switch (entityType) {
        case 'character':
          relationships = await this.buildCharacterRelationships(
            entityId,
            entityName,
            projectId,
            cast,
            storyPlan
          )
          break
        case 'faction':
          relationships = this.buildFactionRelationships(entityName, storyPlan)
          break
        case 'place':
        case 'event':
        case 'rule':
          // Use graph service for these types
          relationships = await this.buildGraphBasedRelationships(entityId, projectId, entityType)
          break
        default:
          relationships = []
      }

      // Generate relationship summary
      const relationshipSummary = this.formatRelationshipSummary(relationships)

      const enriched: EnrichedEntity = {
        id: entityId,
        name: entityName,
        type: entityType,
        description: baseDescription,
        relationships,
        relationshipSummary,
      }

      // Cache result
      enrichmentCache.set(cacheKey, { data: enriched, timestamp: Date.now() })

      return enriched
    } catch (error) {
      console.warn('[RelationshipEnricher] Failed to enrich entity:', error)
      return this.createBasicEnriched(entityId, entityType, entityName, baseDescription)
    }
  }

  /**
   * Build relationships for a character
   */
  private async buildCharacterRelationships(
    characterId: string,
    characterName: string,
    projectId: string,
    cast: CharacterData[],
    storyPlan: Record<string, unknown>
  ): Promise<Relationship[]> {
    const relationships: Relationship[] = []
    const factions = (storyPlan.factions as FactionData[]) || []
    const normalizedName = characterName.toLowerCase()

    // 1. Find faction memberships
    for (const faction of factions) {
      const members = [...(faction.members || []), ...(faction.keyMembers || [])]
      const normalizedMembers = members.map((m: string) => m.toLowerCase())

      if (normalizedMembers.includes(normalizedName)) {
        const factionId = `faction-${faction.name.toLowerCase().replace(/\s+/g, '-')}`
        relationships.push({
          targetId: factionId,
          targetName: faction.name,
          targetType: 'faction',
          relationshipType: 'member_of',
          strength: 0.8,
          description: `Member of ${faction.name}`,
        })
      }

      // Check if this character is mentioned as a rival
      const rivals = faction.rivals || []
      if (rivals.some((r: string) => r.toLowerCase().includes(normalizedName))) {
        const factionId = `faction-${faction.name.toLowerCase().replace(/\s+/g, '-')}`
        relationships.push({
          targetId: factionId,
          targetName: faction.name,
          targetType: 'faction',
          relationshipType: 'rival',
          strength: 0.7,
          description: `Rival of ${faction.name}`,
        })
      }
    }

    // 2. Find relationships with other characters via graph service
    const graphRelations = await entityGraphService.getDirectRelationships(characterId, projectId, {
      types: ['character'],
      maxResults: 5,
      threshold: 0.6,
    })

    for (const rel of graphRelations) {
      // Avoid duplicates
      if (!relationships.some(r => r.targetId === rel.id)) {
        relationships.push({
          targetId: rel.id,
          targetName: rel.name,
          targetType: 'character',
          relationshipType: this.mapRelationshipType(rel.relationshipType),
          strength: rel.relevance,
          description: undefined,
        })
      }
    }

    // 3. Look for explicit relationships in cast metadata
    const characterInCast = cast.find(
      c => c.name.toLowerCase() === normalizedName || c.id === characterId
    )
    if (characterInCast) {
      // Check for relationships defined in character data
      const charMeta = characterInCast as Record<string, unknown>
      if (charMeta.relationships && Array.isArray(charMeta.relationships)) {
        for (const rel of charMeta.relationships) {
          if (rel.target && rel.type) {
            relationships.push({
              targetId: `character-${rel.target.toLowerCase().replace(/\s+/g, '-')}`,
              targetName: rel.target,
              targetType: 'character',
              relationshipType: rel.type,
              strength: rel.strength || 0.7,
              description: rel.description,
            })
          }
        }
      }
    }

    return relationships
  }

  /**
   * Build relationships for a faction
   */
  private buildFactionRelationships(
    factionName: string,
    storyPlan: Record<string, unknown>
  ): Relationship[] {
    const relationships: Relationship[] = []
    const factions = (storyPlan.factions as FactionData[]) || []
    const normalizedName = factionName.toLowerCase()

    // Find this faction
    const thisFaction = factions.find(f => f.name.toLowerCase() === normalizedName)
    if (!thisFaction) return relationships

    // 1. Add members as relationships
    const members = [...(thisFaction.members || []), ...(thisFaction.keyMembers || [])]
    for (const member of members.slice(0, 5)) {
      // Limit to 5 members
      const memberId = `character-${member.toLowerCase().replace(/\s+/g, '-')}`
      relationships.push({
        targetId: memberId,
        targetName: member,
        targetType: 'character',
        relationshipType: 'member_of',
        strength: 0.8,
        description: `${member} is a member`,
      })
    }

    // 2. Add rivals
    const rivals = thisFaction.rivals || []
    for (const rival of rivals) {
      // Check if rival is a faction or character
      const isFaction = factions.some(f => f.name.toLowerCase() === rival.toLowerCase())
      const targetType: EntityType = isFaction ? 'faction' : 'character'
      const targetId = `${targetType}-${rival.toLowerCase().replace(/\s+/g, '-')}`

      relationships.push({
        targetId,
        targetName: rival,
        targetType,
        relationshipType: 'rival',
        strength: 0.7,
        description: `Rival: ${rival}`,
      })
    }

    return relationships
  }

  /**
   * Build relationships using graph service for generic entity types
   */
  private async buildGraphBasedRelationships(
    entityId: string,
    projectId: string,
    _entityType: EntityType
  ): Promise<Relationship[]> {
    const graphRelations = await entityGraphService.getDirectRelationships(entityId, projectId, {
      maxResults: 5,
      threshold: 0.5,
    })

    return graphRelations.map(rel => ({
      targetId: rel.id,
      targetName: rel.name,
      targetType: rel.type,
      relationshipType: this.mapRelationshipType(rel.relationshipType),
      strength: rel.relevance,
      description: undefined,
    }))
  }

  /**
   * Format relationships into a human-readable summary with entity references
   */
  private formatRelationshipSummary(relationships: Relationship[]): string {
    if (relationships.length === 0) return ''

    // Group by relationship type
    const grouped = new Map<RelationshipType, Relationship[]>()
    for (const rel of relationships) {
      if (!grouped.has(rel.relationshipType)) {
        grouped.set(rel.relationshipType, [])
      }
      grouped.get(rel.relationshipType)!.push(rel)
    }

    const parts: string[] = []

    // Format each group
    const typeLabels: Record<RelationshipType, string> = {
      ally: 'Ally of',
      enemy: 'Enemy of',
      rival: 'Rival of',
      mentor: 'Mentor to',
      student: 'Student of',
      lover: 'Lover of',
      family: 'Family of',
      stranger: 'Stranger to',
      acquaintance: 'Acquaintance of',
      complex: 'Complex relationship with',
      member_of: 'Member of',
      leader_of: 'Leader of',
      associated: 'Associated with',
      related: 'Related to',
    }

    for (const [type, rels] of grouped) {
      const label = typeLabels[type] || 'Related to'
      const names = rels.map(r => `[${r.targetName}][${r.targetId}]`).join(', ')
      parts.push(`${label} ${names}`)
    }

    return parts.join('. ') + '.'
  }

  /**
   * Map inferred relationship type to our enum
   */
  private mapRelationshipType(inferred: string): RelationshipType {
    const mapping: Record<string, RelationshipType> = {
      closely_connected: 'ally',
      associated: 'associated',
      related: 'related',
      allied_or_rival: 'rival',
      member_of: 'member_of',
      has_member: 'leader_of',
      associated_with: 'associated',
      involved_in: 'associated',
      controls: 'leader_of',
      involves: 'associated',
      occurred_at: 'associated',
    }
    return mapping[inferred] || 'related'
  }

  /**
   * Create a basic enriched entity without relationships
   */
  private createBasicEnriched(
    entityId: string,
    entityType: EntityType,
    entityName: string,
    description: string
  ): EnrichedEntity {
    return {
      id: entityId,
      name: entityName,
      type: entityType,
      description,
      relationships: [],
      relationshipSummary: '',
    }
  }

  /**
   * Clear the enrichment cache
   */
  clearCache(): void {
    enrichmentCache.clear()
  }

  /**
   * Clear cache for a specific project
   */
  clearProjectCache(projectId: string): void {
    for (const key of enrichmentCache.keys()) {
      if (key.startsWith(`${projectId}:`)) {
        enrichmentCache.delete(key)
      }
    }
  }
}

// Singleton instance
export const relationshipEnricher = new RelationshipEnricherService()

// Export class for testing
export { RelationshipEnricherService }
