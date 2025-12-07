'use client'

import { useParams, useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (projectId && currentProject?.id !== projectId) {
      setIsLoading(true)
      setError(null)

      loadProject(projectId)
        .then(() => {
          // Check if project was actually loaded
          const loadedProject = useWorldStore.getState().currentProject
          if (!loadedProject) {
            // Project doesn't exist - redirect to base path
            setError('Project not found')
            const basePath = '/' + (pathname?.split('/')[1] || '')
            router.replace(basePath)
          }
        })
        .catch(err => {
          console.error('Failed to load project:', err)
          setError('Failed to load project')
          // Redirect to base path
          const basePath = '/' + (pathname?.split('/')[1] || '')
          router.replace(basePath)
        })
        .finally(() => setIsLoading(false))
    } else if (!projectId && currentProject) {
      // Clear project if no projectId in URL
      useWorldStore.setState({ currentProject: null, tiles: {} })
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
