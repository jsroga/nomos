'use client'

import { useState } from 'react'
import { History, Plus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/Button'
import { ButtonSizeKey, ButtonVariantKey } from '@/components/Button/constants/button-styles'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu'
import { AppModuleId, HtmlElementType } from '@/shared/data/constants/protocol'
import type { ChatSession } from '@/shared/chat/core/io/chat-session-contract'
import {
  createChatSession,
  deleteChatSession,
  patchChatSession,
} from '@/shared/chat/core/io/chat-sessions.api'
import { chatSessionsKeys } from '@/shared/chat/core/io/chat-sessions.keys'
import { moduleHasAgent } from '@/shared/chat/core/chat-session-policy'
import { WorkspaceChatCopy } from './workspace-chat-copy'
import { WorkspaceChatHistoryItem } from './WorkspaceChatHistoryItem'
import {
  isWorkspaceChatSessionBusy,
  shouldKeepHistoryMenuOpen,
} from './workspace-chat-session-helpers'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'

export function WorkspaceChatSessionList({
  projectId,
  currentModuleId,
  sessions,
  stopHandlers,
}: {
  projectId: string
  currentModuleId: AppModuleId | null
  sessions: readonly ChatSession[]
  stopHandlers: Map<string, () => void>
}) {
  const queryClient = useQueryClient()
  const focusedSessionId = useWorkspaceChatUiStore(state => state.focusedSessionId)
  const setFocusedSessionId = useWorkspaceChatUiStore(state => state.setFocusedSessionId)
  const localRuntimeStatus = useWorkspaceChatUiStore(state => state.localRuntimeStatus)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: chatSessionsKeys.list(projectId) })

  const createMutation = useMutation({
    mutationFn: () => {
      if (!currentModuleId) throw new Error(WorkspaceChatCopy.ComposerDisabled)
      return createChatSession({ projectId, moduleId: currentModuleId })
    },
    onSuccess: created => {
      setFocusedSessionId(created.id)
      void invalidate()
    },
  })

  const renameMutation = useMutation({
    mutationFn: (input: { id: string; title: string }) => patchChatSession(input.id, { title: input.title }),
    onSuccess: () => {
      setRenameId(null)
      void invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      stopHandlers.get(id)?.()
      await deleteChatSession(id)
    },
    onSuccess: (_void, id) => {
      if (focusedSessionId === id) setFocusedSessionId(null)
      setDeleteId(null)
      void invalidate()
    },
  })

  const canCreate = currentModuleId ? moduleHasAgent(currentModuleId) : false

  const commitRename = (sessionId: string) => {
    const title = renameValue.trim()
    if (title) {
      renameMutation.mutate({ id: sessionId, title })
      return
    }
    setRenameId(null)
  }

  return (
    <div className="flex flex-col gap-2 border-b border-border p-3">
      <div className="flex items-center gap-2">
        <Button
          type={HtmlElementType.Button}
          size={ButtonSizeKey.Sm}
          variant={ButtonVariantKey.Outline}
          className="flex-1"
          disabled={!canCreate}
          onClick={() => createMutation.mutate()}
          title={canCreate ? WorkspaceChatCopy.NewChat : WorkspaceChatCopy.NoAgentDescription}
        >
          <Plus className="mr-1 h-4 w-4" />
          {WorkspaceChatCopy.NewChat}
        </Button>
        <DropdownMenu
          open={historyOpen}
          onOpenChange={open => {
            const keep = shouldKeepHistoryMenuOpen(open, renameId)
            setHistoryOpen(keep)
            if (!keep) setRenameId(null)
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              type={HtmlElementType.Button}
              size={ButtonSizeKey.Icon}
              variant={ButtonVariantKey.Outline}
              title={WorkspaceChatCopy.History}
              aria-label={WorkspaceChatCopy.History}
            >
              <History className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            {sessions.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">{WorkspaceChatCopy.HistoryEmpty}</p>
            ) : (
              sessions.map(session => (
                <WorkspaceChatHistoryItem
                  key={session.id}
                  session={session}
                  selected={session.id === focusedSessionId}
                  running={isWorkspaceChatSessionBusy(session.status, localRuntimeStatus[session.id])}
                  renaming={renameId === session.id}
                  renameValue={renameValue}
                  onRenameValueChange={setRenameValue}
                  onCommitRename={() => commitRename(session.id)}
                  onStartRename={() => {
                    setRenameId(session.id)
                    setRenameValue(session.title)
                  }}
                  onFocusSession={() => {
                    setFocusedSessionId(session.id)
                    setHistoryOpen(false)
                  }}
                  onDelete={() => setDeleteId(session.id)}
                />
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={open => {
          if (!open) setDeleteId(null)
        }}
        title={WorkspaceChatCopy.DeleteTitle}
        description={WorkspaceChatCopy.DeleteDescription}
        confirmLabel={WorkspaceChatCopy.Delete}
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId)
        }}
      />
    </div>
  )
}
