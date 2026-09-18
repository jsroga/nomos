import { create } from 'zustand'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { ChatSessionSendDecision } from '@/shared/chat/core/constants/chat-session'
import type { ChatSession } from '@/shared/chat/core/io/chat-session-contract'
import {
  persistWorkspaceChatOverlayOpen,
  readWorkspaceChatOverlayOpen,
} from '@/shared/chat/state/utils/workspace-chat-overlay-open'
import {
  persistWorkspaceChatFocusedSessionId,
  readWorkspaceChatFocusedSessionId,
} from '@/shared/chat/state/utils/workspace-chat-overlay-focus'

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
  previousFocusedSessionId: string | null
  focusedSessionModuleId: AppModuleId | null
  mismatchDialog: WorkspaceChatMismatch | null
  queuedSend: WorkspaceChatQueuedSend | null
  localRuntimeStatus: Record<string, string>
  draftSession: ChatSession | null
  toggleOverlay: () => void
  setOverlayOpen: (open: boolean) => void
  setFocusedSessionId: (id: string | null, moduleId?: AppModuleId | null) => void
  setMismatchDialog: (dialog: WorkspaceChatMismatch | null) => void
  setQueuedSend: (queued: WorkspaceChatQueuedSend | null) => void
  setLocalRuntimeStatus: (sessionId: string, status: string) => void
  clearLocalRuntimeStatus: (sessionId: string) => void
  setDraftSession: (session: ChatSession | null) => void
  activateDraftSession: (session: ChatSession) => void
}

function overlayOpenState(overlayOpen: boolean): { overlayOpen: boolean } {
  persistWorkspaceChatOverlayOpen(overlayOpen)
  return { overlayOpen }
}

export const useWorkspaceChatUiStore = create<WorkspaceChatUiState>(set => ({
  overlayOpen: readWorkspaceChatOverlayOpen(),
  focusedSessionId: readWorkspaceChatFocusedSessionId(),
  previousFocusedSessionId: null,
  focusedSessionModuleId: null,
  mismatchDialog: null,
  queuedSend: null,
  localRuntimeStatus: {},
  draftSession: null,
  toggleOverlay: () => set(state => overlayOpenState(!state.overlayOpen)),
  setOverlayOpen: overlayOpen => set(overlayOpenState(overlayOpen)),
  setFocusedSessionId: (focusedSessionId, moduleId = null) =>
    set(state => {
      persistWorkspaceChatFocusedSessionId(focusedSessionId)
      const previousFocusedSessionId =
        focusedSessionId && focusedSessionId !== state.focusedSessionId
          ? state.focusedSessionId
          : state.previousFocusedSessionId
      return {
        previousFocusedSessionId,
        focusedSessionId,
        focusedSessionModuleId: focusedSessionId ? moduleId : null,
      }
    }),
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
  setDraftSession: draftSession => set({ draftSession }),
  activateDraftSession: draftSession =>
    set(state => {
      persistWorkspaceChatFocusedSessionId(draftSession.id)
      const previousFocusedSessionId =
        draftSession.id !== state.focusedSessionId
          ? state.focusedSessionId
          : state.previousFocusedSessionId
      return {
        draftSession,
        previousFocusedSessionId,
        focusedSessionId: draftSession.id,
        focusedSessionModuleId: draftSession.moduleId,
      }
    }),
}))
