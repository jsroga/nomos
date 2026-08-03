import { useState, useEffect, useCallback, useRef } from 'react'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { buildUrl, joinUrlPath } from '@/shared/data/url-builder'
import {
  DomAbortErrorName,
  GameEntityClientLog,
  GameEntityQueryParam,
} from '@/shared/data/constants/game-entities-wire'
import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'

export type EntityType = 'character' | 'location' | 'mechanic' | 'faction' | 'item' | 'quest'
export type SourceDomain = 'storyteller' | 'loop-creator' | '3d-canvas' | '2d-canvas'

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
  metadata: Record<string, unknown>
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
  metadata: Record<string, unknown>
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

  // Track if initial fetch has been done to prevent duplicate fetches
  const hasFetchedRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Store previous values to detect actual changes
  const prevOptionsRef = useRef<string>('')

  const fetchEntities = useCallback(
    async (forceRefresh = false) => {
      if (!projectId && autoFetch) return

      // Create a key for the current options to compare
      const optionsKey = JSON.stringify({ projectId, entityType, sourceDomain, search })

      // Skip if nothing changed and not forcing refresh
      if (!forceRefresh && hasFetchedRef.current && prevOptionsRef.current === optionsKey) {
        return
      }

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          buildUrl('/api/entities', {
            [GameEntityQueryParam.ProjectId]: projectId,
            [GameEntityQueryParam.EntityType]: entityType,
            [GameEntityQueryParam.SourceDomain]: sourceDomain,
            [GameEntityQueryParam.Search]: search,
          }),
          {
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(API_ERROR.FAILED_FETCH_ENTITIES)
        }

        const data = await response.json()
        setEntities(data.entities || [])
        hasFetchedRef.current = true
        prevOptionsRef.current = optionsKey
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === DomAbortErrorName.AbortError) {
          return
        }
        setError(err instanceof Error ? err.message : API_ERROR.FAILED_FETCH_ENTITIES)
        console.error(GameEntityClientLog.FetchError, err)
      } finally {
        setLoading(false)
      }
    },
    [projectId, entityType, sourceDomain, search, autoFetch]
  )

  const createEntity = useCallback(
    async (entity: {
      projectId: string
      userId: string
      entityType: EntityType
      name: string
      description?: string
      sourceDomain: SourceDomain
      sourceEntityId?: string
      metadata?: Record<string, unknown>
      tags?: string[]
      imageUrl?: string
    }): Promise<GameEntity | null> => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/entities', {
          method: HttpMethod.Post,
          headers: { 'Content-Type': ContentType.Json },
          body: JSON.stringify(entity),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || API_ERROR.FAILED_CREATE_ENTITY)
        }

        const data = await response.json()

        // Add to local state
        setEntities(prev => [data.entity, ...prev])

        return data.entity
      } catch (err) {
        setError(err instanceof Error ? err.message : API_ERROR.FAILED_CREATE_ENTITY)
        console.error(GameEntityClientLog.CreateError, err)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const updateEntity = useCallback(
    async (
      entityId: string,
      updates: {
        name?: string
        description?: string
        metadata?: Record<string, unknown>
        tags?: string[]
        imageUrl?: string
        usedInDomains?: string[]
      }
    ): Promise<GameEntity | null> => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(joinUrlPath('/api/entities', entityId), {
          method: HttpMethod.Patch,
          headers: { 'Content-Type': ContentType.Json },
          body: JSON.stringify(updates),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || API_ERROR.FAILED_UPDATE_ENTITY)
        }

        const data = await response.json()

        // Update local state
        setEntities(prev => prev.map(e => (e.id === entityId ? data.entity : e)))

        return data.entity
      } catch (err) {
        setError(err instanceof Error ? err.message : API_ERROR.FAILED_UPDATE_ENTITY)
        console.error(GameEntityClientLog.UpdateError, err)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const deleteEntity = useCallback(async (entityId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(joinUrlPath('/api/entities', entityId), {
        method: HttpMethod.Delete,
      })

      if (!response.ok) {
        throw new Error(API_ERROR.FAILED_DELETE_ENTITY)
      }

      // Remove from local state
      setEntities(prev => prev.filter(e => e.id !== entityId))

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : API_ERROR.FAILED_DELETE_ENTITY)
      console.error(GameEntityClientLog.DeleteError, err)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const markUsedInDomain = useCallback(
    async (entityId: string, domain: SourceDomain): Promise<boolean> => {
      const entity = entities.find(e => e.id === entityId)
      if (!entity) return false

      const usedInDomains = Array.from(new Set([...entity.usedInDomains, domain]))
      const updated = await updateEntity(entityId, { usedInDomains })
      return !!updated
    },
    [entities, updateEntity]
  )

  const getEntity = useCallback(
    (entityId: string): GameEntity | undefined => {
      return entities.find(e => e.id === entityId)
    },
    [entities]
  )

  const getEntitiesByType = useCallback(
    (type: EntityType): GameEntity[] => {
      return entities.filter(e => e.entityType === type)
    },
    [entities]
  )

  const getEntitiesByDomain = useCallback(
    (domain: SourceDomain): GameEntity[] => {
      return entities.filter(e => e.sourceDomain === domain || e.usedInDomains.includes(domain))
    },
    [entities]
  )

  // Initial fetch - only run once when projectId is available
  useEffect(() => {
    if (autoFetch && projectId) {
      fetchEntities()
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, []) // Empty deps - only run on mount

  // Re-fetch when options change (with debounce for search)
  useEffect(() => {
    if (!autoFetch || !projectId) return

    // Debounce search changes
    const timeoutId = setTimeout(
      () => {
        fetchEntities()
      },
      search !== undefined ? 300 : 0
    ) // Debounce only for search

    return () => clearTimeout(timeoutId)
  }, [projectId, entityType, sourceDomain, search, autoFetch, fetchEntities])

  return {
    entities,
    loading,
    error,
    fetchEntities: () => fetchEntities(true), // Force refresh when called manually
    createEntity,
    updateEntity,
    deleteEntity,
    markUsedInDomain,
    getEntity,
    getEntitiesByType,
    getEntitiesByDomain,
  }
}
