'use client'

import { create } from 'zustand'
import type { WorkspaceProject } from './types'

type WorkspaceProjectMutationListener = (project: WorkspaceProject | null) => void

const mutationListeners = new Set<WorkspaceProjectMutationListener>()

export function onWorkspaceProjectMutation(listener: WorkspaceProjectMutationListener) {
  mutationListeners.add(listener)
  return () => {
    mutationListeners.delete(listener)
  }
}

function notifyWorkspaceProjectMutation(project: WorkspaceProject | null) {
  for (const listener of mutationListeners) {
    listener(project)
  }
}

interface WorkspaceProjectState {
  currentProject: WorkspaceProject | null
  setCurrentProject: (project: WorkspaceProject) => void
  clearCurrentProject: () => void
  syncCurrentProjectSilent: (project: WorkspaceProject | null) => void
}

export const useWorkspaceProjectStore = create<WorkspaceProjectState>(set => ({
  currentProject: null,

  setCurrentProject: project => {
    set({ currentProject: project })
    notifyWorkspaceProjectMutation(project)
  },

  clearCurrentProject: () => {
    set({ currentProject: null })
    notifyWorkspaceProjectMutation(null)
  },

  syncCurrentProjectSilent: project => {
    set({ currentProject: project })
  },
}))
