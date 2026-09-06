'use client'

/**
 * assistant-ui Thread — container-query chat surface (thread + composer only).
 */

import { ThreadPrimitive } from '@assistant-ui/react'
import './assistant-thread.css'
import type { AssistantMentionBundle } from './useAssistantMentions'
import {
  ASSISTANT_THREAD_COPY,
  type AssistantChatModelOption,
} from '../core/constants/assistant-thread-ui'
import { AssistantChatDetailsProvider } from './AssistantChatDetailsContext'
import { AssistantThreadComposer } from './AssistantThreadComposer'
import { AssistantMessage, UserMessage } from './AssistantThreadMessages'

const MESSAGE_COMPONENTS = { UserMessage, AssistantMessage }

interface AssistantThreadProps {
  suggestions?: readonly string[]
  mentions?: AssistantMentionBundle
  chatModelId?: string
  chatModelOptions?: readonly AssistantChatModelOption[]
  onChatModelChange?: (modelId: string) => void
  composerEnabled?: boolean
  onBeforeSend?: (text: string) => boolean
}

export function AssistantThread({
  suggestions = [],
  mentions,
  chatModelId,
  chatModelOptions,
  onChatModelChange,
  composerEnabled = true,
  onBeforeSend,
}: AssistantThreadProps) {
  return (
    <AssistantChatDetailsProvider>
      <ThreadPrimitive.Root className="aui-chat">
        <div className="aui-chat-glow" aria-hidden />

        <ThreadPrimitive.Viewport className="aui-thread">
          <div className="aui-thread-col">
            <ThreadPrimitive.Empty>
              <div className="aui-empty">
                <span className="aui-empty-hint">{ASSISTANT_THREAD_COPY.EmptyHint}</span>
                {suggestions.length > 0 ? (
                  <div className="aui-chips justify-center">
                    {suggestions.map(prompt => (
                      <ThreadPrimitive.Suggestion
                        key={prompt}
                        prompt={prompt}
                        autoSend
                        className="aui-chip"
                      >
                        {prompt}
                      </ThreadPrimitive.Suggestion>
                    ))}
                  </div>
                ) : null}
              </div>
            </ThreadPrimitive.Empty>

            <ThreadPrimitive.Messages components={MESSAGE_COMPONENTS} />

            <ThreadPrimitive.ScrollToBottom className="aui-scroll-bottom">↓</ThreadPrimitive.ScrollToBottom>
          </div>
        </ThreadPrimitive.Viewport>

        <AssistantThreadComposer
          mentions={mentions}
          chatModelId={chatModelId}
          chatModelOptions={chatModelOptions}
          onChatModelChange={onChatModelChange}
          composerEnabled={composerEnabled}
          onBeforeSend={onBeforeSend}
        />
      </ThreadPrimitive.Root>
    </AssistantChatDetailsProvider>
  )
}
