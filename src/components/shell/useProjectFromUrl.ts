'use client'

import { useParams, useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { useWorldStore } from '@/domains/2d-canvas'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import { isValidProjectId } from '@/shared/auth/security'
import { AUTH_ROUTE } from '@/shared/auth/constants/auth-messages'
import {
  ProjectLoaderLog,
  ProjectLoaderMessage,
} from '@/shared/data/constants/project-loader'

export function useProjectFromUrl() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()

  // Handle both single projectId and catch-all array
  const rawProjectId = params?.projectId
  const candidateId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId
  const projectId =
    typeof candidateId === 'string' && isValidProjectId(candidateId) ? candidateId : undefined

  const currentProject = useWorkspaceProjectStore(state => state.currentProject)
  const loadWorkspaceProject = useWorkspaceProjectStore(state => state.loadProject)
  const clearCurrentProject = useWorkspaceProjectStore(state => state.clearCurrentProject)
  const loadTilesForProject = useWorldStore(state => state.loadTilesForProject)
  const clearTiles = useWorldStore(state => state.clearTiles)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track if we've already loaded this project to prevent re-fetches
  const loadedProjectIdRef = useRef<string | null>(null)

  useEffect(() => {
    // Reserved paths (e.g. /projects) can match `[projectId]` — never hit the API.
    if (typeof candidateId === 'string' && candidateId.length > 0 && !projectId) {
      router.replace(AUTH_ROUTE.PROJECTS)
      return
    }

    const shouldLoad =
      projectId && currentProject?.id !== projectId && loadedProjectIdRef.current !== projectId

    if (shouldLoad) {
      console.log(ProjectLoaderLog.StartingLoad, projectId)
      setIsLoading(true)
      setError(null)
      loadedProjectIdRef.current = projectId

      void (async () => {
        try {
          const loadedProject = await loadWorkspaceProject(projectId)
          if (loadedProject) {
            await loadTilesForProject(projectId)
          }

          console.log(ProjectLoaderLog.LoadComplete, !!loadedProject)
          if (!loadedProject) {
            console.warn(ProjectLoaderLog.ProjectNotFoundRedirect)
            setError(ProjectLoaderMessage.ProjectNotFound)
            loadedProjectIdRef.current = null
            router.replace(AUTH_ROUTE.PROJECTS)
          }
        } catch (err) {
          console.error(ProjectLoaderLog.FailedLoadProject, err)
          setError(ProjectLoaderMessage.FailedLoadProject)
          loadedProjectIdRef.current = null
          router.replace(AUTH_ROUTE.PROJECTS)
        } finally {
          setIsLoading(false)
        }
      })()
    } else if (!projectId && currentProject) {
      clearCurrentProject()
      clearTiles()
      loadedProjectIdRef.current = null
    }
  }, [
    candidateId,
    projectId,
    currentProject?.id,
    loadWorkspaceProject,
    loadTilesForProject,
    clearCurrentProject,
    clearTiles,
    router,
    pathname,
  ])

  return {
    projectId,
    currentProject,
    isLoading,
    error,
    hasProject: !!projectId,
  }
}
