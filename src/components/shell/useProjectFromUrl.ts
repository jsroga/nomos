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
import {
  isProjectLoaderBlocking,
  isWorkspaceProjectReady,
  shouldReloadWorkspaceProject,
} from '@/components/shell/should-reload-workspace-project'

export function useProjectFromUrl() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()

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
  const loaderBlocking = isProjectLoaderBlocking({
    isLoading,
    urlProjectId: projectId,
    currentProjectId: currentProject?.id,
  })
  const projectReady = isWorkspaceProjectReady({
    urlProjectId: projectId,
    currentProjectId: currentProject?.id,
    isLoading,
  })

  const loadedProjectIdRef = useRef<string | null>(null)
  const loadInFlightRef = useRef<string | null>(null)

  useEffect(() => {
    if (typeof candidateId === 'string' && candidateId.length > 0 && !projectId) {
      router.replace(AUTH_ROUTE.PROJECTS)
      return
    }

    if (!projectId) {
      if (currentProject) {
        clearCurrentProject()
        clearTiles()
      }
      loadedProjectIdRef.current = null
      return
    }

    const shouldLoad = shouldReloadWorkspaceProject({
      projectId,
      currentProjectId: currentProject?.id,
      loadedProjectId: loadedProjectIdRef.current,
    })

    if (!shouldLoad) return
    if (loadInFlightRef.current === projectId) return

    loadedProjectIdRef.current = null
    if (currentProject?.id && currentProject.id !== projectId) {
      clearCurrentProject()
      clearTiles()
    }

    console.log(ProjectLoaderLog.StartingLoad, projectId)
    setIsLoading(true)
    setError(null)
    loadInFlightRef.current = projectId

    void (async () => {
      try {
        const loadedProject = await loadWorkspaceProject(projectId)
        console.log(ProjectLoaderLog.LoadComplete, !!loadedProject)
        if (!loadedProject) {
          console.warn(ProjectLoaderLog.ProjectNotFoundRedirect)
          setError(ProjectLoaderMessage.ProjectNotFound)
          loadedProjectIdRef.current = null
          router.replace(AUTH_ROUTE.PROJECTS)
          return
        }
        loadedProjectIdRef.current = projectId
        void loadTilesForProject(projectId)
      } catch (err) {
        console.error(ProjectLoaderLog.FailedLoadProject, err)
        setError(ProjectLoaderMessage.FailedLoadProject)
        loadedProjectIdRef.current = null
      } finally {
        if (loadInFlightRef.current === projectId) loadInFlightRef.current = null
        setIsLoading(false)
      }
    })()
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
    isLoading: loaderBlocking,
    isReady: projectReady,
    error,
    hasProject: !!projectId,
  }
}
