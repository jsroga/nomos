'use client'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ChatSessionSendDecision } from '@/shared/chat/core/constants/chat-session'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'
import { WorkspaceChatCopy } from './workspace-chat-copy'

export function WorkspaceChatMismatchDialog({
  onConfirmNewChat,
}: {
  onConfirmNewChat: (bufferedText: string) => void
}) {
  const mismatchDialog = useWorkspaceChatUiStore(state => state.mismatchDialog)
  const setMismatchDialog = useWorkspaceChatUiStore(state => state.setMismatchDialog)
  const isMismatch = mismatchDialog?.decision === ChatSessionSendDecision.ModuleMismatch
  const isNoAgent = mismatchDialog?.decision === ChatSessionSendDecision.ModuleHasNoAgent

  return (
    <ConfirmDialog
      open={mismatchDialog !== null}
      onOpenChange={open => {
        if (!open) setMismatchDialog(null)
      }}
      title={isNoAgent ? WorkspaceChatCopy.NoAgentTitle : WorkspaceChatCopy.MismatchTitle}
      description={
        isNoAgent ? WorkspaceChatCopy.NoAgentDescription : WorkspaceChatCopy.MismatchDescription
      }
      confirmLabel={isMismatch ? WorkspaceChatCopy.MismatchConfirm : WorkspaceChatCopy.Ok}
      onConfirm={() => {
        if (isMismatch && mismatchDialog) onConfirmNewChat(mismatchDialog.bufferedText)
        setMismatchDialog(null)
      }}
    />
  )
}
