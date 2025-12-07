import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type OperationType = 'world-gen' | '3d-gen' | '3d-remesh' | 'story-agent'

export interface AsyncOperation {
  id: string
  type: OperationType
  label: string
  details?: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
}

interface GlobalStatusState {
  operations: AsyncOperation[]
  isExpanded: boolean

  // Actions
  addOperation: (op: AsyncOperation) => void
  removeOperation: (id: string) => void
  updateOperation: (id: string, updates: Partial<AsyncOperation>) => void
  toggleExpanded: () => void
  setExpanded: (expanded: boolean) => void
}

export const useGlobalStatusStore = create<GlobalStatusState>()(
  persist(
    set => ({
      operations: [],
      isExpanded: true,

      addOperation: op =>
        set(state => {
          // Prevent duplicates if id already exists
          if (state.operations.some(o => o.id === op.id)) {
            return state
          }
          return { operations: [...state.operations, op] }
        }),

      removeOperation: id =>
        set(state => ({
          operations: state.operations.filter(op => op.id !== id),
        })),

      updateOperation: (id, updates) =>
        set(state => ({
          operations: state.operations.map(op => (op.id === id ? { ...op, ...updates } : op)),
        })),

      toggleExpanded: () => set(state => ({ isExpanded: !state.isExpanded })),
      setExpanded: expanded => set({ isExpanded: expanded }),
    }),
    {
      name: 'global-status-storage',
      partialize: state => ({ isExpanded: state.isExpanded }), // Only persist isExpanded
    }
  )
)
