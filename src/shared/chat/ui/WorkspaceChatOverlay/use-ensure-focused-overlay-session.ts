'use client'

import { useEffect, useRef } from 'react'
import type { AppModuleId } from '@/shared/data/constants/protocol'
import {
  createDraftChatSession,
  shouldCreateFocusedOverlaySession,
} from '@/shared/chat/core/overlay-session-runtime'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'

export function useEnsureFocusedOverlaySession(input: {
  overlayOpen: boolean
  listReady: boolean
  sessionCount: number
  projectId: string
  currentModuleId: AppModuleId | null
  currentHasAgent: boolean
  hasDraft: boolean
}): void {
  const activateDraftSession = useWorkspaceChatUiStore(state => state.activateDraftSession)
  const creating = useRef(false)

  useEffect(() => {
    const moduleId = input.currentModuleId
    if (
      !shouldCreateFocusedOverlaySession({
        overlayOpen: input.overlayOpen,
        listReady: input.listReady,
        sessionCount: input.sessionCount,
        canCreate: Boolean(input.projectId && moduleId && input.currentHasAgent),
        hasDraft: input.hasDraft,
      })
    ) {
      return
    }
    if (!moduleId || creating.current) return
    creating.current = true
    const created = createDraftChatSession({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      moduleId,
    })
    activateDraftSession(created)
    creating.current = false
  }, [
    input.overlayOpen,
    input.listReady,
    input.sessionCount,
    input.projectId,
    input.currentModuleId,
    input.currentHasAgent,
    input.hasDraft,
    activateDraftSession,
  ])
}
