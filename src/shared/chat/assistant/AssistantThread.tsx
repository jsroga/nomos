'use client'

/**
 * Minimal assistant-ui Thread built from the primitives — the foundation the
 * @/shared/chat migration grows from. Styling is intentionally light; richer
 * features (markdown, mentions, citations, agent logs, HITL) arrive in later
 * migration phases.
 */

import { ThreadPrimitive, ComposerPrimitive, MessagePrimitive } from '@assistant-ui/react'

const SEND_LABEL = 'Send'
const INPUT_PLACEHOLDER = 'Write a message…'

function UserMessage() {
  return (
    <MessagePrimitive.Root className="ml-auto max-w-[80%] rounded-2xl bg-black/10 px-4 py-2 text-sm dark:bg-white/10">
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  )
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="mr-auto max-w-[80%] rounded-2xl px-4 py-2 text-sm">
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  )
}

export function AssistantThread() {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      <ThreadPrimitive.Viewport className="flex-1 space-y-3 overflow-y-auto p-4">
        <ThreadPrimitive.Messages
          components={{ UserMessage, AssistantMessage }}
        />
      </ThreadPrimitive.Viewport>

      <ComposerPrimitive.Root className="flex items-end gap-2 border-t border-black/10 p-3 dark:border-white/10">
        <ComposerPrimitive.Input
          placeholder={INPUT_PLACEHOLDER}
          className="max-h-40 flex-1 resize-none rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none dark:border-white/15"
        />
        <ComposerPrimitive.Send className="rounded-md bg-black px-3 py-2 text-sm text-white dark:bg-white dark:text-black">
          {SEND_LABEL}
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  )
}
