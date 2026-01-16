import { useState, useEffect, useCallback } from 'react'

export type EntityType = 'character' | 'location' | 'mechanic' | 'faction' | 'item' | 'quest'
export type SourceDomain = 'storyteller' | 'loop-creator' | 'interior-designer' | 'world-building'

export interface GameEntity {
  id: string
  projectId: string
  userId: string
  entityType: EntityType
  name: string
  description?: string
  sourceDomain: SourceDomain
  sourceEntityId?: string
  usedInDomains: string[]
  metadata: Record<string, any>
  tags: string[]
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export interface EntityRelationship {
  id: string
  projectId: string
  fromEntityId: string
  toEntityId: string
  relationshipType: 'uses' | 'located_in' | 'conflicts_with' | 'allies_with' | 'owns' | 'part_of'
  metadata: Record<string, any>
  fromEntity?: GameEntity
  toEntity?: GameEntity
  createdAt: string
}

interface UseGameEntitiesOptions {
  projectId?: string
  entityType?: EntityType
  sourceDomain?: SourceDomain
  search?: string
  autoFetch?: boolean
}

/**
 * Hook for managing game entities across all domains
 */
export function useGameEntities(options: UseGameEntitiesOptions = {}) {
  const { projectId, entityType, sourceDomain, search, autoFetch = true } = options
  
  const [entities, setEntities] = useState<GameEntity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEntities = useCallback(async () => {
    if (!projectId && autoFetch) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (projectId) params.append('projectId', projectId)
      if (entityType) params.append('entityType', entityType)
      if (sourceDomain) params.append('sourceDomain', sourceDomain)
      if (search) params.append('search', search)

      const response = await fetch(`/api/entities?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch entities')
      }

      const data = await response.json()
      setEntities(data.entities || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch entities')
      console.error('[useGameEntities] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId, entityType, sourceDomain, search, autoFetch])

  const createEntity = useCallback(async (entity: {
    projectId: string
    userId: string
    entityType: EntityType
    name: string
    description?: string
    sourceDomain: SourceDomain
    sourceEntityId?: string
    metadata?: Record<string, any>
    tags?: string[]
    imageUrl?: string
  }): Promise<GameEntity | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entity),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create entity')
      }

      const data = await response.json()
      
      // Add to local state
      setEntities(prev => [data.entity, ...prev])
      
      return data.entity
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create entity')
      console.error('[useGameEntities] Create error:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateEntity = useCallback(async (
    entityId: string,
    updates: {
      name?: string
      description?: string
      metadata?: Record<string, any>
      tags?: string[]
      imageUrl?: string
      usedInDomains?: string[]
    }
  ): Promise<GameEntity | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/entities/${entityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update entity')
      }

      const data = await response.json()
      
      // Update local state
      setEntities(prev => 
        prev.map(e => e.id === entityId ? data.entity : e)
      )
      
      return data.entity
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entity')
      console.error('[useGameEntities] Update error:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteEntity = useCallback(async (entityId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/entities/${entityId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete entity')
      }

      // Remove from local state
      setEntities(prev => prev.filter(e => e.id !== entityId))
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entity')
      console.error('[useGameEntities] Delete error:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const markUsedInDomain = useCallback(async (
    entityId: string,
    domain: SourceDomain
  ): Promise<boolean> => {
    const entity = entities.find(e => e.id === entityId)
    if (!entity) return false

    const usedInDomains = Array.from(new Set([...entity.usedInDomains, domain]))
    const updated = await updateEntity(entityId, { usedInDomains })
    return !!updated
  }, [entities, updateEntity])

  const getEntity = useCallback((entityId: string): GameEntity | undefined => {
    return entities.find(e => e.id === entityId)
  }, [entities])

  const getEntitiesByType = useCallback((type: EntityType): GameEntity[] => {
    return entities.filter(e => e.entityType === type)
  }, [entities])

  const getEntitiesByDomain = useCallback((domain: SourceDomain): GameEntity[] => {
    return entities.filter(e => 
      e.sourceDomain === domain || e.usedInDomains.includes(domain)
    )
  }, [entities])

  useEffect(() => {
    if (autoFetch) {
      fetchEntities()
    }
  }, [fetchEntities, autoFetch])

  return {
    entities,
    loading,
    error,
    fetchEntities,
    createEntity,
    updateEntity,
    deleteEntity,
    markUsedInDomain,
    getEntity,
    getEntitiesByType,
    getEntitiesByDomain,
  }
}

/**
 * Hook for managing entity relationships
 */
export function useEntityRelationships(entityId?: string, projectId?: string) {
  const [relationships, setRelationships] = useState<EntityRelationship[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRelationships = useCallback(async () => {
    if (!entityId) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('entityId', entityId)
      if (projectId) params.append('projectId', projectId)

      const response = await fetch(`/api/entities/relationships?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch relationships')
      }

      const data = await response.json()
      setRelationships(data.relationships || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch relationships')
      console.error('[useEntityRelationships] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [entityId, projectId])

  const createRelationship = useCallback(async (relationship: {
    projectId: string
    fromEntityId: string
    toEntityId: string
    relationshipType: 'uses' | 'located_in' | 'conflicts_with' | 'allies_with' | 'owns' | 'part_of'
    metadata?: Record<string, any>
  }): Promise<EntityRelationship | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/entities/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(relationship),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create relationship')
      }

      const data = await response.json()
      
      // Add to local state
      setRelationships(prev => [data.relationship, ...prev])
      
      return data.relationship
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create relationship')
      console.error('[useEntityRelationships] Create error:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteRelationship = useCallback(async (relationshipId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/entities/relationships?id=${relationshipId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete relationship')
      }

      // Remove from local state
      setRelationships(prev => prev.filter(r => r.id !== relationshipId))
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete relationship')
      console.error('[useEntityRelationships] Delete error:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (entityId) {
      fetchRelationships()
    }
  }, [fetchRelationships, entityId])

  return {
    relationships,
    loading,
    error,
    fetchRelationships,
    createRelationship,
    deleteRelationship,
  }
}

