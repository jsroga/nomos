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
  type SourceMessagePartComponent,
} from '@assistant-ui/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AssistantToolFallback } from './AssistantToolFallback'
import type { AssistantMentionBundle } from './useAssistantMentions'

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

const SourceCitation: SourceMessagePartComponent = ({ url, title }) => (
  <a
    href={url}
    target="_blank"
    rel="noreferrer"
    className="mr-2 inline-block rounded border border-black/10 px-1.5 py-0.5 text-xs opacity-70 hover:opacity-100 dark:border-white/10"
  >
    {title ?? url}
  </a>
)

const PART_COMPONENTS = {
  Text: MarkdownText,
  Reasoning: ReasoningText,
  Source: SourceCitation,
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

const MENTION_TRIGGER_CHAR = '@'

interface AssistantThreadProps {
  /** Starter prompts shown in the empty state (quick-action parity). */
  suggestions?: readonly string[]
  /** `@`-mention adapter bundle (from useAssistantMentions); enables the mention popover. */
  mentions?: AssistantMentionBundle
}

export function AssistantThread({ suggestions = [], mentions }: AssistantThreadProps) {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      <ThreadPrimitive.Viewport className="relative flex-1 space-y-3 overflow-y-auto p-4">
        <ThreadPrimitive.Empty>
          <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-sm">
            <span className="opacity-50">{EMPTY_HINT}</span>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map(prompt => (
                  <ThreadPrimitive.Suggestion
                    key={prompt}
                    prompt={prompt}
                    autoSend
                    className="rounded-full border border-black/15 px-3 py-1 text-xs opacity-80 hover:opacity-100 dark:border-white/15"
                  >
                    {prompt}
                  </ThreadPrimitive.Suggestion>
                ))}
              </div>
            )}
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages components={MESSAGE_COMPONENTS} />

        <ThreadPrimitive.ScrollToBottom className="sticky bottom-2 ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/80 text-sm shadow disabled:invisible dark:border-white/10 dark:bg-black/60">
          {SCROLL_LABEL}
        </ThreadPrimitive.ScrollToBottom>
      </ThreadPrimitive.Viewport>

      <ComposerPrimitive.Unstable_TriggerPopoverRoot>
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

        {mentions && (
          <ComposerPrimitive.Unstable_TriggerPopover
            char={MENTION_TRIGGER_CHAR}
            adapter={mentions.adapter}
            className="z-10 max-h-64 w-72 overflow-y-auto rounded-md border border-black/10 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-neutral-900"
          >
            <ComposerPrimitive.Unstable_TriggerPopover.Directive formatter={mentions.directive.formatter} />
            <ComposerPrimitive.Unstable_TriggerPopoverItems>
              {items =>
                items.map((item, index) => (
                  <ComposerPrimitive.Unstable_TriggerPopoverItem
                    key={item.id}
                    item={item}
                    index={index}
                    className="flex w-full flex-col items-start rounded px-2 py-1 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <span>{item.label}</span>
                    {item.description && (
                      <span className="text-xs opacity-50">{item.description}</span>
                    )}
                  </ComposerPrimitive.Unstable_TriggerPopoverItem>
                ))
              }
            </ComposerPrimitive.Unstable_TriggerPopoverItems>
          </ComposerPrimitive.Unstable_TriggerPopover>
        )}
      </ComposerPrimitive.Unstable_TriggerPopoverRoot>
    </ThreadPrimitive.Root>
  )
}
