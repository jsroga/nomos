import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type OperationType = 'world-gen' | '3d-gen' | '3d-remesh' | 'story-agent' | 'portrait-gen' | 'retexture' | 'text-to-3d' | 'upload'

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
          const newOperations = [...state.operations, op]
          console.log('🔄 [GlobalStatusStore] addOperation:', newOperations)
          return { operations: newOperations }
        }),

      removeOperation: id =>
        set(state => {
          const newOperations = state.operations.filter(op => op.id !== id)
          console.log('🔄 [GlobalStatusStore] removeOperation:', newOperations)
          return { operations: newOperations }
        }),

      updateOperation: (id, updates) =>
        set(state => {
          const newOperations = state.operations.map(op => (op.id === id ? { ...op, ...updates } : op))
          console.log('🔄 [GlobalStatusStore] updateOperation:', newOperations)
          return { operations: newOperations }
        }),

      toggleExpanded: () => set(state => ({ isExpanded: !state.isExpanded })),
      setExpanded: expanded => set({ isExpanded: expanded }),
    }),
    {
      name: 'global-status-storage',
      partialize: state => ({
        isExpanded: state.isExpanded,
        operations: state.operations // Persist operations for page refresh
      }),
    }
  )
)

// Log initial state on store creation/hydration
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const initialState = useGlobalStatusStore.getState()
    console.log('🔄 [GlobalStatusStore] Initial state:', initialState.operations)
  }, 0)
}

