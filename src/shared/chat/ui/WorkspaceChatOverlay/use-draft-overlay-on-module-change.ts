'use client'

import { useEffect, useRef } from 'react'
import type { AppModuleId } from '@/shared/data/constants/protocol'
import type { ChatSession } from '@/shared/chat/core/io/chat-session-contract'
import {
  createDraftChatSession,
  shouldKeepFocusedSessionOnModuleChange,
} from '@/shared/chat/core/overlay-session-runtime'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'
import { isWorkspaceChatSessionBusy } from './workspace-chat-session-helpers'

export function useDraftOverlayOnModuleChange(input: {
  projectId: string
  currentModuleId: AppModuleId | null
  focusedSessionId: string | null
  visibleSessions: readonly ChatSession[]
  localRuntimeStatus: Readonly<Record<string, string>>
}): void {
  const previousModuleId = useRef(input.currentModuleId)
  const activateDraftSession = useWorkspaceChatUiStore(state => state.activateDraftSession)

  useEffect(() => {
    const previous = previousModuleId.current
    previousModuleId.current = input.currentModuleId
    if (!input.currentModuleId || !input.projectId) return
    if (previous === input.currentModuleId) return
    const focused =
      input.visibleSessions.find(session => session.id === input.focusedSessionId) ?? null
    const busy = focused
      ? isWorkspaceChatSessionBusy(focused.status, input.localRuntimeStatus[focused.id])
      : false
    if (shouldKeepFocusedSessionOnModuleChange(busy)) return
    const draft = createDraftChatSession({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      moduleId: input.currentModuleId,
    })
    activateDraftSession(draft)
  }, [
    input.currentModuleId,
    input.focusedSessionId,
    input.localRuntimeStatus,
    input.projectId,
    input.visibleSessions,
    activateDraftSession,
  ])
}
