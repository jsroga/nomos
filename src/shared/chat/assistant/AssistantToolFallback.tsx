'use client'

import { useMemo, useState } from 'react'
import type { ToolCallMessagePartComponent } from '@assistant-ui/react'
import { useMessage } from '@assistant-ui/react'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { ChatActivityLine, ChatChromeStack, ChatToolCard } from '@/shared/chat/ui/ChatChrome'
import {
  CHAT_CHROME_COPY,
  formatToolDebugLabel,
  formatToolsCalledLabel,
  toolCardBodyMessage,
  uniqueToolNames,
} from '@/shared/chat/core/utils/chat-chrome'
import { compactToolAckMessage } from './compact-tool-ack'
import { useAssistantChatDetails } from './AssistantChatDetailsContext'
import { createToolNamesSnapshotSelector } from './tool-args-from-assistant-content'

enum ToolPartStatusType {
  RequiresAction = 'requires-action',
  Running = 'running',
}

const APPROVE_LABEL = 'Approve'
const DENY_LABEL = 'Deny'

function stringify(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

function debugDump(args: unknown, result: unknown): string {
  const parts: string[] = []
  if (args != null) parts.push(stringify(args))
  if (result != null) parts.push(stringify(result))
  return parts.join('\n')
}

export const AssistantToolFallback: ToolCallMessagePartComponent = ({
  toolName,
  args,
  result,
  status,
  respondToApproval,
}) => {
  const { showDetails } = useAssistantChatDetails()
  const [open, setOpen] = useState(true)
  const needsApproval = status.type === ToolPartStatusType.RequiresAction
  const namesSelector = useMemo(() => {
    const select = createToolNamesSnapshotSelector()
    return (message: { content: readonly unknown[] }) => select(message.content)
  }, [])
  const toolNames = useMessage(namesSelector)
  const uniqueNames = uniqueToolNames(toolNames)
  const isFirstTool = uniqueNames[0] === toolName
  const compactMessage = compactToolAckMessage(result)
  const running = status.type === ToolPartStatusType.Running
  const title =
    running
      ? CHAT_CHROME_COPY.Running
      : showDetails
        ? formatToolDebugLabel(toolName)
        : toolName
  const message = toolCardBodyMessage(title, compactMessage)

  return (
    <ChatChromeStack>
      {isFirstTool && !showDetails ? (
        <ChatActivityLine>{formatToolsCalledLabel(uniqueNames.length)}</ChatActivityLine>
      ) : null}
      <ChatToolCard
        title={title}
        message={message}
        debugText={showDetails ? debugDump(args, result) : undefined}
        open={open}
        busy={running}
        interactive={showDetails && !running}
        onToggle={() => setOpen(value => !value)}
      />
      {needsApproval ? (
        <div className="mt-2 flex gap-2">
          <button
            type={HtmlElementType.Button}
            onClick={() => respondToApproval({ approved: true })}
            className="rounded bg-black px-2 py-1 text-white dark:bg-white dark:text-black"
          >
            {APPROVE_LABEL}
          </button>
          <button
            type={HtmlElementType.Button}
            onClick={() => respondToApproval({ approved: false })}
            className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
          >
            {DENY_LABEL}
          </button>
        </div>
      ) : null}
    </ChatChromeStack>
  )
}
