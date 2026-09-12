'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { AppModuleId } from '@/shared/data/constants/protocol'
import { createChatSession } from '@/shared/chat/core/io/chat-sessions.api'
import { chatSessionsKeys } from '@/shared/chat/core/io/chat-sessions.keys'
import type { ChatSession } from '@/shared/chat/core/io/chat-session-contract'
import {
  prependCreatedChatSession,
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
}): void {
  const queryClient = useQueryClient()
  const setFocusedSessionId = useWorkspaceChatUiStore(state => state.setFocusedSessionId)
  const creating = useRef(false)

  useEffect(() => {
    const moduleId = input.currentModuleId
    if (
      !shouldCreateFocusedOverlaySession({
        overlayOpen: input.overlayOpen,
        listReady: input.listReady,
        sessionCount: input.sessionCount,
        canCreate: Boolean(input.projectId && moduleId && input.currentHasAgent),
      })
    ) {
      return
    }
    if (!moduleId || creating.current) return
    creating.current = true
    void (async () => {
      try {
        const created = await createChatSession({
          projectId: input.projectId,
          moduleId,
        })
        queryClient.setQueryData(
          chatSessionsKeys.list(input.projectId),
          (current: ChatSession[] | undefined) => prependCreatedChatSession(current, created),
        )
        setFocusedSessionId(created.id, created.moduleId)
        await queryClient.invalidateQueries({ queryKey: chatSessionsKeys.list(input.projectId) })
      } finally {
        creating.current = false
      }
    })()
  }, [
    input.overlayOpen,
    input.listReady,
    input.sessionCount,
    input.projectId,
    input.currentModuleId,
    input.currentHasAgent,
    queryClient,
    setFocusedSessionId,
  ])
}
