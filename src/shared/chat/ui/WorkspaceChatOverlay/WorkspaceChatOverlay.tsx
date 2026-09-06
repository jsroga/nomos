'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useParams, usePathname } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { isValidProjectId } from '@/shared/auth/security'
import { readString } from '@/shared/data/json-guards'
import {
  canSendToSession,
  moduleHasAgent,
  parseWorkspaceModuleId,
} from '@/shared/chat/core/chat-session-policy'
import { ChatSessionSendDecision } from '@/shared/chat/core/constants/chat-session'
import type { ChatSession } from '@/shared/chat/core/io/chat-session-contract'
import { createChatSession, listChatSessions, markChatSessionIdle } from '@/shared/chat/core/io/chat-sessions.api'
import { chatSessionsKeys } from '@/shared/chat/core/io/chat-sessions.keys'
import {
  selectMountedSessions,
  streamingSessionsWithoutRunId,
} from '@/shared/chat/core/overlay-session-runtime'
import { getDefaultChatAdapter, type ModuleChatAdapter } from '@/shared/chat/overlay/module-chat-adapters'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'
import { WorkspaceChatClass, WorkspaceChatCopy } from './workspace-chat-copy'
import { WorkspaceChatMismatchDialog } from './WorkspaceChatMismatchDialog'
import { WorkspaceChatSessionList } from './WorkspaceChatSessionList'
import { WorkspaceChatSessionRuntime } from './WorkspaceChatSessionRuntime'

export function WorkspaceChatOverlay({
  adapters,
}: {
  adapters: Partial<Record<AppModuleId, ModuleChatAdapter>>
}) {
  const pathname = usePathname()
  const params = useParams()
  const queryClient = useQueryClient()
  const overlayOpen = useWorkspaceChatUiStore(state => state.overlayOpen)
  const focusedSessionId = useWorkspaceChatUiStore(state => state.focusedSessionId)
  const setFocusedSessionId = useWorkspaceChatUiStore(state => state.setFocusedSessionId)
  const setMismatchDialog = useWorkspaceChatUiStore(state => state.setMismatchDialog)
  const setQueuedSend = useWorkspaceChatUiStore(state => state.setQueuedSend)
  const stopHandlers = useMemo(() => new Map<string, () => void>(), [])
  const hydrated = useRef(false)

  const rawProjectId = readString(params?.projectId)
  const projectId = rawProjectId && isValidProjectId(rawProjectId) ? rawProjectId : ''
  const currentModuleId = parseWorkspaceModuleId(pathname ?? '')
  const currentHasAgent = currentModuleId ? moduleHasAgent(currentModuleId) : false

  const sessionsQuery = useQuery({
    queryKey: chatSessionsKeys.list(projectId),
    queryFn: () => listChatSessions(projectId),
    enabled: Boolean(projectId),
  })

  const sessions = sessionsQuery.data ?? []

  useEffect(() => {
    if (hydrated.current || !sessionsQuery.data) return
    hydrated.current = true
    const orphans = streamingSessionsWithoutRunId(sessionsQuery.data)
    for (const session of orphans) {
      void markChatSessionIdle(session.id)
    }
  }, [sessionsQuery.data])

  const mounted = useMemo(
    () => selectMountedSessions(sessions, focusedSessionId),
    [sessions, focusedSessionId],
  )

  const focused = sessions.find(session => session.id === focusedSessionId) ?? null

  const adapterFor = (session: ChatSession): ModuleChatAdapter =>
    adapters[session.moduleId] ?? getDefaultChatAdapter(session.moduleId)

  const onBeforeSend = (text: string): boolean => {
    if (!focused || !currentModuleId) {
      setMismatchDialog({
        decision: ChatSessionSendDecision.ModuleHasNoAgent,
        bufferedText: text,
      })
      return false
    }
    const decision = canSendToSession(
      focused.moduleId,
      currentModuleId,
      currentHasAgent,
    )
    if (decision === ChatSessionSendDecision.Ok) return true
    setMismatchDialog({ decision, bufferedText: text })
    return false
  }

  const onConfirmNewChat = (bufferedText: string) => {
    if (!currentModuleId || !currentHasAgent) return
    void (async () => {
      const created = await createChatSession({ projectId, moduleId: currentModuleId })
      setFocusedSessionId(created.id)
      setQueuedSend({ sessionId: created.id, text: bufferedText, id: Date.now() })
      await queryClient.invalidateQueries({ queryKey: chatSessionsKeys.list(projectId) })
    })()
  }

  return (
    <aside
      className={overlayOpen ? WorkspaceChatClass.Panel : WorkspaceChatClass.PanelHidden}
      hidden={!overlayOpen}
      aria-hidden={!overlayOpen}
      aria-label={WorkspaceChatCopy.PanelAria}
    >
      <WorkspaceChatSessionList
        projectId={projectId}
        currentModuleId={currentModuleId}
        sessions={sessions}
        stopHandlers={stopHandlers}
      />
      <div className="relative min-h-0 flex-1">
        {mounted.map(session => (
          <WorkspaceChatSessionRuntime
            key={session.id}
            session={session}
            projectId={projectId}
            hidden={session.id !== focusedSessionId}
            composerEnabled={currentHasAgent}
            onBeforeSend={onBeforeSend}
            onChatStatus={() => undefined}
            stopHandlers={stopHandlers}
            adapter={adapterFor(session)}
          />
        ))}
      </div>
      <WorkspaceChatMismatchDialog onConfirmNewChat={onConfirmNewChat} />
    </aside>
  )
}
