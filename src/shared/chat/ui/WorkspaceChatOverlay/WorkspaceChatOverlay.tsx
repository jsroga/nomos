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
import { listChatSessions, markChatSessionIdle } from '@/shared/chat/core/io/chat-sessions.api'
import { chatSessionsKeys } from '@/shared/chat/core/io/chat-sessions.keys'
import {
  selectMountedSessions,
  selectFocusedSessionId,
  streamingSessionsWithoutRunId,
} from '@/shared/chat/core/overlay-session-runtime'
import { queueNewWorkspaceChat } from '@/shared/chat/state/queue-new-workspace-chat'
import { getDefaultChatAdapter, type ModuleChatAdapter } from '@/shared/chat/overlay/module-chat-adapters'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { useEnsureFocusedOverlaySession } from './use-ensure-focused-overlay-session'
import { useHydratedWorkspaceChatOverlayOpen } from './use-hydrated-overlay-open'
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
  const overlayOpen = useHydratedWorkspaceChatOverlayOpen()
  const focusedSessionId = useWorkspaceChatUiStore(state => state.focusedSessionId)
  const focusedSessionModuleId = useWorkspaceChatUiStore(state => state.focusedSessionModuleId)
  const setFocusedSessionId = useWorkspaceChatUiStore(state => state.setFocusedSessionId)
  const setMismatchDialog = useWorkspaceChatUiStore(state => state.setMismatchDialog)
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

  useEffect(() => {
    if (!sessionsQuery.isSuccess) return
    const next = selectFocusedSessionId(sessions, focusedSessionId)
    const nextModule = sessions.find(session => session.id === next)?.moduleId ?? null
    if (next !== focusedSessionId || nextModule !== focusedSessionModuleId) {
      setFocusedSessionId(next, nextModule)
    }
  }, [
    sessions,
    focusedSessionId,
    focusedSessionModuleId,
    sessionsQuery.isSuccess,
    setFocusedSessionId,
  ])

  useEnsureFocusedOverlaySession({
    overlayOpen,
    listReady: sessionsQuery.isSuccess,
    sessionCount: sessions.length,
    projectId,
    currentModuleId,
    currentHasAgent,
  })

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
    void queueNewWorkspaceChat({
      projectId,
      moduleId: currentModuleId,
      text: bufferedText,
      queryClient,
    })
  }

  return (
    <>
      <aside
        id={TOUR_STEP_IDS.STORYTELLER_CHAT}
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
      </aside>
      <WorkspaceChatMismatchDialog onConfirmNewChat={onConfirmNewChat} />
    </>
  )
}
