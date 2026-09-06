import { create } from 'zustand'
import { ChatSessionSendDecision } from '@/shared/chat/core/constants/chat-session'

export type WorkspaceChatMismatch = {
  decision: ChatSessionSendDecision
  bufferedText: string
}

export type WorkspaceChatQueuedSend = {
  sessionId: string
  text: string
  id: number
}

interface WorkspaceChatUiState {
  overlayOpen: boolean
  focusedSessionId: string | null
  mismatchDialog: WorkspaceChatMismatch | null
  queuedSend: WorkspaceChatQueuedSend | null
  localRuntimeStatus: Record<string, string>
  toggleOverlay: () => void
  setOverlayOpen: (open: boolean) => void
  setFocusedSessionId: (id: string | null) => void
  setMismatchDialog: (dialog: WorkspaceChatMismatch | null) => void
  setQueuedSend: (queued: WorkspaceChatQueuedSend | null) => void
  setLocalRuntimeStatus: (sessionId: string, status: string) => void
  clearLocalRuntimeStatus: (sessionId: string) => void
}

export const useWorkspaceChatUiStore = create<WorkspaceChatUiState>(set => ({
  overlayOpen: false,
  focusedSessionId: null,
  mismatchDialog: null,
  queuedSend: null,
  localRuntimeStatus: {},
  toggleOverlay: () => set(state => ({ overlayOpen: !state.overlayOpen })),
  setOverlayOpen: overlayOpen => set({ overlayOpen }),
  setFocusedSessionId: focusedSessionId => set({ focusedSessionId }),
  setMismatchDialog: mismatchDialog => set({ mismatchDialog }),
  setQueuedSend: queuedSend => set({ queuedSend }),
  setLocalRuntimeStatus: (sessionId, status) =>
    set(state => ({
      localRuntimeStatus: { ...state.localRuntimeStatus, [sessionId]: status },
    })),
  clearLocalRuntimeStatus: sessionId =>
    set(state => {
      const next = { ...state.localRuntimeStatus }
      Reflect.deleteProperty(next, sessionId)
      return { localRuntimeStatus: next }
    }),
}))
