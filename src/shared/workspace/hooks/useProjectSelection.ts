'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { useAuthStore } from '@/shared/auth/useAuthStore'
import { DialogConfirmVariant } from '@/shared/data/constants/protocol'
import {
  PROJECT_SELECTION_DELETE_CANCEL,
  PROJECT_SELECTION_DELETE_CONFIRM,
  PROJECT_SELECTION_DELETE_DESCRIPTION,
  PROJECT_SELECTION_DELETE_TITLE,
  PROJECT_SELECTION_SUBTITLES,
  PROJECT_SELECTION_TURBULENT_BG_CANVAS_ID,
  PROJECT_SELECTOR_BIBLE_QUERY,
  ProjectSelectionLiquidGlobal,
} from '../constants/project-selection'
import { useWorkspaceProjectStore } from '../workspace-project-store'

function readLiquidGLRenderer():
  | { _uploadTexture: (canvas: HTMLCanvasElement) => void }
  | undefined {
  const candidate: unknown = Reflect.get(window, ProjectSelectionLiquidGlobal.Renderer)
  if (typeof candidate !== 'object' || candidate === null) {
    return undefined
  }
  const uploadTexture: unknown = Reflect.get(candidate, ProjectSelectionLiquidGlobal.UploadTexture)
  if (typeof uploadTexture !== 'function') {
    return undefined
  }
  return {
    _uploadTexture: (canvas: HTMLCanvasElement) => {
      uploadTexture(canvas)
    },
  }
}

export function useProjectSelection() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const user = useAuthStore(state => state.user)
  const projects = useWorkspaceProjectStore(state => state.projects)
  const fetchAllProjects = useWorkspaceProjectStore(state => state.fetchAllProjects)
  const createProject = useWorkspaceProjectStore(state => state.createProject)
  const deleteProject = useWorkspaceProjectStore(state => state.deleteProject)
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [subtitle] = useState(
    () => PROJECT_SELECTION_SUBTITLES[Math.floor(Math.random() * PROJECT_SELECTION_SUBTITLES.length)]
  )
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null)

  useEffect(() => {
    let rafId: number
    const updateTexture = () => {
      const bgCanvas = document.getElementById(PROJECT_SELECTION_TURBULENT_BG_CANVAS_ID)
      const renderer = readLiquidGLRenderer()

      if (bgCanvas instanceof HTMLCanvasElement && renderer) {
        renderer._uploadTexture(bgCanvas)
      }
      rafId = requestAnimationFrame(updateTexture)
    }
    rafId = requestAnimationFrame(updateTexture)
    return () => cancelAnimationFrame(rafId)
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled) return

      if (!session) {
        router.push('/login')
        return
      }

      await fetchAllProjects()
      if (!cancelled) {
        setIsLoading(false)
      }
    }

    void init()

    return () => {
      cancelled = true
    }
  }, [fetchAllProjects, router, supabase])

  const handleSelectProject = (projectId: string) => {
    setLoadingProjectId(projectId)
    router.push(`/${projectId}/storyteller?${PROJECT_SELECTOR_BIBLE_QUERY}`)
  }

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    const confirmed = await confirm({
      title: PROJECT_SELECTION_DELETE_TITLE,
      description: PROJECT_SELECTION_DELETE_DESCRIPTION,
      confirmLabel: PROJECT_SELECTION_DELETE_CONFIRM,
      cancelLabel: PROJECT_SELECTION_DELETE_CANCEL,
      variant: DialogConfirmVariant.Destructive,
    })
    if (confirmed) {
      await deleteProject(projectId)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    setIsCreating(true)
    const id = await createProject(newProjectName, '')
    if (id) {
      router.push(`/${id}/storyteller?${PROJECT_SELECTOR_BIBLE_QUERY}`)
    } else {
      setIsCreating(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return {
    user,
    projects,
    isLoading,
    isCreating,
    newProjectName,
    setNewProjectName,
    subtitle,
    loadingProjectId,
    handleSelectProject,
    handleDeleteProject,
    handleCreateProject,
    handleLogout,
    ConfirmDialogComponent,
  }
}
