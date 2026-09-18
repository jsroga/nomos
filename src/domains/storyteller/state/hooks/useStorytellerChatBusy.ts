'use client'

import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { isStorytellerWorkspaceBusy } from '@/domains/storyteller/state/utils/storyteller-chat-busy'
import { isAnyWorkspaceChatRuntimeBusy } from '@/shared/chat/ui/WorkspaceChatOverlay/workspace-chat-session-helpers'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'

/** True while Writers Room chat is queued, submitted, streaming, in a tool call, or Fix inconsistencies is running. */
export function useStorytellerChatBusy(): boolean {
  const phase = useStorytellerUiStore(state => state.generationActivity.phase)
  const fixPhase = useStorytellerUiStore(state => state.consistencyFixRun.phase)
  const pendingChatPrompt = useStorytellerUiStore(state => state.pendingChatPrompt)
  const overlayBusy = useWorkspaceChatUiStore(state =>
    isAnyWorkspaceChatRuntimeBusy(state.localRuntimeStatus),
  )
  return isStorytellerWorkspaceBusy({
    generationPhase: phase,
    pendingChatPrompt,
    fixPhase,
    overlayBusy,
  })
}
