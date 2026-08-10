'use client'

import { create } from 'zustand'
import { useAuthStore } from '@/shared/auth/useAuthStore'
import { isValidProjectId } from '@/shared/auth/security'
import { WorkspaceProjectsLog } from './constants/workspace-projects'
import {
  createWorkspaceProject,
  deleteWorkspaceProject,
  fetchWorkspaceProjects,
} from './io/projects.api'
import { fetchWorkspaceProject } from './io/project-session.api'
import type { WorkspaceProject } from './types'

const WORKSPACE_PROJECT_LOAD_FAILED = 'Failed to load workspace project:'
const WORKSPACE_PROJECT_INVALID_ID = 'Skipped workspace project load — invalid id:'

interface WorkspaceProjectState {
  projects: WorkspaceProject[]
  currentProject: WorkspaceProject | null
  setCurrentProject: (project: WorkspaceProject) => void
  clearCurrentProject: () => void
  fetchAllProjects: () => Promise<void>
  createProject: (name: string, masterPrompt: string) => Promise<string | null>
  deleteProject: (projectId: string) => Promise<void>
  loadProject: (projectId: string) => Promise<WorkspaceProject | null>
}

export const useWorkspaceProjectStore = create<WorkspaceProjectState>((set, get) => ({
  projects: [],
  currentProject: null,

  setCurrentProject: project => {
    set({ currentProject: project })
  },

  clearCurrentProject: () => {
    set({ currentProject: null })
  },

  fetchAllProjects: async () => {
    try {
      const projects = await fetchWorkspaceProjects()
      set({ projects })
    } catch (error) {
      console.error(WorkspaceProjectsLog.ErrorFetchingProjects, error)
    }
  },

  createProject: async (name: string, masterPrompt: string) => {
    const { user } = useAuthStore.getState()
    if (!user) return null

    try {
      const created = await createWorkspaceProject({ name, masterPrompt })
      set(state => ({ projects: [created, ...state.projects] }))
      await get().loadProject(created.id)
      return created.id
    } catch (error) {
      console.error(WorkspaceProjectsLog.ErrorCreatingProject, error)
      return null
    }
  },

  deleteProject: async (projectId: string) => {
    try {
      await deleteWorkspaceProject(projectId)
      set(state => ({
        projects: state.projects.filter(project => project.id !== projectId),
      }))
      if (get().currentProject?.id === projectId) {
        get().clearCurrentProject()
      }
    } catch (error) {
      console.error(WorkspaceProjectsLog.ErrorDeletingProject, error)
    }
  },

  loadProject: async projectId => {
    if (!isValidProjectId(projectId)) {
      console.warn(WORKSPACE_PROJECT_INVALID_ID, projectId)
      set({ currentProject: null })
      return null
    }
    try {
      const project = await fetchWorkspaceProject(projectId)
      set({ currentProject: project })
      return project
    } catch (err) {
      console.error(WORKSPACE_PROJECT_LOAD_FAILED, err)
      set({ currentProject: null })
      return null
    }
  },
}))
