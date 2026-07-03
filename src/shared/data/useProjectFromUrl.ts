'use client'

import { useParams, useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'

export function useProjectFromUrl() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()

  // Handle both single projectId and catch-all array
  const rawProjectId = params?.projectId
  const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId

  const currentProject = useWorldStore(state => state.currentProject)
  const loadProject = useWorldStore(state => state.loadProject)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track if we've already loaded this project to prevent re-fetches
  const loadedProjectIdRef = useRef<string | null>(null)

  useEffect(() => {
    // Only load if:
    // 1. We have a projectId in URL
    // 2. currentProject doesn't match (or doesn't exist)
    // 3. We haven't already loaded this project in this session
    const shouldLoad =
      projectId && currentProject?.id !== projectId && loadedProjectIdRef.current !== projectId

    if (shouldLoad) {
      console.log('🔄 [DEBUG] useProjectFromUrl: starting load for', projectId)
      setIsLoading(true)
      setError(null)
      loadedProjectIdRef.current = projectId // Mark as loading

      loadProject(projectId)
        .then(() => {
          // Check if project was actually loaded
          const loadedProject = useWorldStore.getState().currentProject
          console.log('✅ [DEBUG] useProjectFromUrl: load complete. Result:', !!loadedProject)
          if (!loadedProject) {
            // Project doesn't exist - redirect to base path
            console.warn(
              '⚠️ [DEBUG] useProjectFromUrl: project not found, redirecting to base path'
            )
            setError('Project not found')
            loadedProjectIdRef.current = null // Reset on error
            const basePath = '/' + (pathname?.split('/')[1] || '')
            router.replace(basePath)
          }
        })
        .catch(err => {
          console.error('Failed to load project:', err)
          setError('Failed to load project')
          loadedProjectIdRef.current = null // Reset on error
          // Redirect to base path
          const basePath = '/' + (pathname?.split('/')[1] || '')
          router.replace(basePath)
        })
        .finally(() => setIsLoading(false))
    } else if (!projectId && currentProject) {
      // Clear project if no projectId in URL
      useWorldStore.setState({ currentProject: null, tiles: {} })
      loadedProjectIdRef.current = null
    }
  }, [projectId, currentProject?.id, loadProject, router, pathname])

  return {
    projectId,
    currentProject,
    isLoading,
    error,
    hasProject: !!projectId,
  }
}
