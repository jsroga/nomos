'use client'

import { useEffect, useMemo, useState } from 'react'
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
  PROJECT_SORT_CYCLE,
  ProjectSortMode,
} from '../constants/project-selection'
import { filterAndSortProjects, groupProjectsByMonth } from '../lib/group-projects'
import { useWorkspaceProjectStore } from '../workspace-project-store'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState(ProjectSortMode.Newest)
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null)

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

  const visibleProjects = useMemo(
    () => filterAndSortProjects(projects, searchQuery, sortMode),
    [projects, searchQuery, sortMode],
  )

  const monthGroups = useMemo(
    () => groupProjectsByMonth(visibleProjects),
    [visibleProjects],
  )

  const handleSelectProject = (projectId: string) => {
    setLoadingProjectId(projectId)
    router.push(`/${projectId}/storyteller`)
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
      router.push(`/${id}/storyteller`)
    } else {
      setIsCreating(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const cycleSortMode = () => {
    const index = PROJECT_SORT_CYCLE.indexOf(sortMode)
    const next = PROJECT_SORT_CYCLE[(index + 1) % PROJECT_SORT_CYCLE.length]
    setSortMode(next ?? ProjectSortMode.Newest)
  }

  return {
    user,
    projects,
    projectCount: projects.length,
    monthGroups,
    visibleCount: visibleProjects.length,
    isLoading,
    isCreating,
    newProjectName,
    setNewProjectName,
    searchQuery,
    setSearchQuery,
    sortMode,
    cycleSortMode,
    loadingProjectId,
    handleSelectProject,
    handleDeleteProject,
    handleCreateProject,
    handleLogout,
    ConfirmDialogComponent,
  }
}
