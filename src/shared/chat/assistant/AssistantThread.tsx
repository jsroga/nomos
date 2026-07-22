'use client'

/**
 * assistant-ui Thread (B1 parity: markdown text, reasoning, stop/regenerate,
 * empty + scroll-to-bottom). Built from primitives so later phases can layer
 * tool UIs, citations, and mentions (see PLATFORM-ROADMAP.md Track B).
 */

import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ActionBarPrimitive,
  type TextMessagePartComponent,
  type ReasoningMessagePartComponent,
} from '@assistant-ui/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AssistantToolFallback } from './AssistantToolFallback'

const SEND_LABEL = 'Send'
const STOP_LABEL = 'Stop'
const COPY_LABEL = 'Copy'
const REGENERATE_LABEL = 'Regenerate'
const INPUT_PLACEHOLDER = 'Write a message…'
const EMPTY_HINT = 'Start a conversation.'
const SCROLL_LABEL = '↓'

const MarkdownText: TextMessagePartComponent = ({ text }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
)

const ReasoningText: ReasoningMessagePartComponent = ({ text }) => (
  <div className="mb-1 border-l-2 border-black/15 pl-2 text-xs italic opacity-60 dark:border-white/15">
    {text}
  </div>
)

const PART_COMPONENTS = {
  Text: MarkdownText,
  Reasoning: ReasoningText,
  tools: { Fallback: AssistantToolFallback },
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="ml-auto max-w-[80%] rounded-2xl bg-black/10 px-4 py-2 text-sm dark:bg-white/10">
      <MessagePrimitive.Parts components={PART_COMPONENTS} />
    </MessagePrimitive.Root>
  )
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="group mr-auto max-w-[80%] rounded-2xl px-4 py-2 text-sm">
      <div className="leading-relaxed">
        <MessagePrimitive.Parts components={PART_COMPONENTS} />
      </div>
      <ActionBarPrimitive.Root
        hideWhenRunning
        autohide="not-last"
        className="mt-1 flex gap-3 text-xs opacity-0 transition-opacity group-hover:opacity-60"
      >
        <ActionBarPrimitive.Copy>{COPY_LABEL}</ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Reload>{REGENERATE_LABEL}</ActionBarPrimitive.Reload>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  )
}

const MESSAGE_COMPONENTS = { UserMessage, AssistantMessage }

export function AssistantThread() {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      <ThreadPrimitive.Viewport className="relative flex-1 space-y-3 overflow-y-auto p-4">
        <ThreadPrimitive.Empty>
          <div className="flex h-full items-center justify-center text-sm opacity-50">
            {EMPTY_HINT}
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages components={MESSAGE_COMPONENTS} />

        <ThreadPrimitive.ScrollToBottom className="sticky bottom-2 ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/80 text-sm shadow disabled:invisible dark:border-white/10 dark:bg-black/60">
          {SCROLL_LABEL}
        </ThreadPrimitive.ScrollToBottom>
      </ThreadPrimitive.Viewport>

      <ComposerPrimitive.Root className="flex items-end gap-2 border-t border-black/10 p-3 dark:border-white/10">
        <ComposerPrimitive.Input
          placeholder={INPUT_PLACEHOLDER}
          className="max-h-40 flex-1 resize-none rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none dark:border-white/15"
        />
        <ThreadPrimitive.If running={false}>
          <ComposerPrimitive.Send className="rounded-md bg-black px-3 py-2 text-sm text-white dark:bg-white dark:text-black">
            {SEND_LABEL}
          </ComposerPrimitive.Send>
        </ThreadPrimitive.If>
        <ThreadPrimitive.If running>
          <ComposerPrimitive.Cancel className="rounded-md border border-black/20 px-3 py-2 text-sm dark:border-white/20">
            {STOP_LABEL}
          </ComposerPrimitive.Cancel>
        </ThreadPrimitive.If>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  )
}
