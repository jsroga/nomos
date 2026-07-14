import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  GLOBAL_STATUS_ADD_OPERATION_LOG,
  GLOBAL_STATUS_INITIAL_STATE_LOG,
  GLOBAL_STATUS_REMOVE_OPERATION_LOG,
  GLOBAL_STATUS_STORAGE_KEY,
  GLOBAL_STATUS_UPDATE_OPERATION_LOG,
} from '@/shared/jobs/constants/global-status-store'

export type OperationType =
  | 'world-gen'
  | '3d-gen'
  | '3d-remesh'
  | 'story-agent'
  | 'portrait-gen'
  | 'retexture'
  | 'text-to-3d'
  | 'upload'
  | 'material-gen'

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
          console.log(GLOBAL_STATUS_ADD_OPERATION_LOG, newOperations)
          return { operations: newOperations }
        }),

      removeOperation: id =>
        set(state => {
          const newOperations = state.operations.filter(op => op.id !== id)
          console.log(GLOBAL_STATUS_REMOVE_OPERATION_LOG, newOperations)
          return { operations: newOperations }
        }),

      updateOperation: (id, updates) =>
        set(state => {
          const newOperations = state.operations.map(op =>
            op.id === id ? { ...op, ...updates } : op
          )
          console.log(GLOBAL_STATUS_UPDATE_OPERATION_LOG, newOperations)
          return { operations: newOperations }
        }),

      toggleExpanded: () => set(state => ({ isExpanded: !state.isExpanded })),
      setExpanded: expanded => set({ isExpanded: expanded }),
    }),
    {
      name: GLOBAL_STATUS_STORAGE_KEY,
      partialize: state => ({
        isExpanded: state.isExpanded,
        operations: state.operations, // Persist operations for page refresh
      }),
    }
  )
)

// Log initial state on store creation/hydration
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const initialState = useGlobalStatusStore.getState()
    console.log(GLOBAL_STATUS_INITIAL_STATE_LOG, initialState.operations)
  }, 0)
}
