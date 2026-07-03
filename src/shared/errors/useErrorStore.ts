import { create } from 'zustand'

export interface CapturedError {
  id: string
  message: string
  stack?: string
  timestamp: Date
  source?: string
}

interface ErrorState {
  errors: CapturedError[]
  isPanelOpen: boolean
  hasUnviewedErrors: boolean

  // Actions
  addError: (error: Omit<CapturedError, 'id' | 'timestamp'>) => void
  clearErrors: () => void
  markErrorsAsViewed: () => void
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
}

export const useErrorStore = create<ErrorState>()(set => ({
  errors: [],
  isPanelOpen: false,
  hasUnviewedErrors: false,

  addError: error =>
    set(state => ({
      errors: [
        {
          ...error,
          id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
        },
        ...state.errors,
      ].slice(0, 50), // Keep last 50 errors max
      hasUnviewedErrors: true,
    })),

  clearErrors: () => set({ errors: [], hasUnviewedErrors: false }),

  markErrorsAsViewed: () => set({ hasUnviewedErrors: false }),

  openPanel: () =>
    set(state => ({
      isPanelOpen: true,
      hasUnviewedErrors: false,
    })),

  closePanel: () => set({ isPanelOpen: false }),

  togglePanel: () =>
    set(state => ({
      isPanelOpen: !state.isPanelOpen,
      hasUnviewedErrors: state.isPanelOpen ? state.hasUnviewedErrors : false,
    })),
}))
