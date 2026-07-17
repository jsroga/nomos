'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Textarea } from '@/components/Textarea'
import { cn } from '@/shared/data/utils'
import { MentionItem, MentionProvider, ProjectContext } from '../core/mentions/types'
import { buildMessageWithContext } from '../core/mentions/context-builder'
import { MentionChipBar } from './MentionChip'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import {
  CHAT_INPUT_AUTO_HEIGHT,
  CHAT_INPUT_DEFAULT_PLACEHOLDER,
  CHAT_INPUT_HEIGHT_UNIT,
} from './constants/chat-input'
import { ChatInputMentionPopover } from './ChatInputMentionPopover'
import { ChatInputQueueBar } from './ChatInputQueueBar'
import { ChatInputActions } from './ChatInputActions'
import { createChatInputKeyDownHandler } from './useChatInputKeyboard'
import { useChatInputMentions } from './useChatInputMentions'

interface ChatInputProps {
  onSend: (message: string) => void
  onStop?: () => void
  isSending: boolean
  placeholder?: string
  maxLength?: number
  mentionProviders?: MentionProvider[]
  projectContext?: ProjectContext
  mentions?: MentionItem[]
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  isSending,
  placeholder = CHAT_INPUT_DEFAULT_PLACEHOLDER,
  maxLength = 1000,
  mentionProviders = [],
  projectContext,
  mentions: legacyMentions = [],
}) => {
  const [input, setInput] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [pendingQueue, setPendingQueue] = useState<string[]>([])
  const [lastEnterTime, setLastEnterTime] = useState(0)
  const [selectedMentions, setSelectedMentions] = useState<MentionItem[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { groupedMentions, flatFilteredList } = useChatInputMentions(
    mentionProviders,
    projectContext,
    legacyMentions,
    mentionFilter
  )

  const resetInputState = useCallback(() => {
    setInput('')
    setSelectedMentions([])
    if (textareaRef.current) {
      textareaRef.current.style.height = CHAT_INPUT_AUTO_HEIGHT
    }
  }, [])

  const buildCurrentMessage = useCallback(() => {
    return buildMessageWithContext(
      input.trim(),
      selectedMentions.map(item => ({ item, startIndex: 0, endIndex: 0 }))
    )
  }, [input, selectedMentions])

  const flushAndSend = useCallback(() => {
    const allMessages = [...pendingQueue]
    if (input.trim()) {
      allMessages.push(buildCurrentMessage())
    }
    if (allMessages.length === 0) return
    allMessages.forEach(msg => onSend(msg))
    setPendingQueue([])
    resetInputState()
  }, [pendingQueue, input, buildCurrentMessage, onSend, resetInputState])

  const addToQueue = useCallback(() => {
    if (!input.trim()) return
    setPendingQueue(prev => [...prev, buildCurrentMessage()])
    resetInputState()
  }, [input, buildCurrentMessage, resetInputState])

  const insertMention = useCallback((item: MentionItem) => {
    if (!item?.name) return
    const lastAtIndex = input.lastIndexOf('@')
    setInput(input.substring(0, lastAtIndex) + '@' + item.name + ' ')
    setShowMentions(false)
    setMentionFilter('')
    setSelectedMentions(prev => (prev.find(m => m.id === item.id) ? prev : [...prev, item]))
    textareaRef.current?.focus()
  }, [input])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    createChatInputKeyDownHandler({
      showMentions,
      flatFilteredList,
      selectedIndex,
      setSelectedIndex,
      insertMention,
      setShowMentions,
      pendingQueue,
      input,
      isSending,
      lastEnterTime,
      setLastEnterTime,
      flushAndSend,
      addToQueue,
      selectedMentions,
      onSend,
      setInput,
      setSelectedMentions,
      textareaRef,
    })(e)
  }

  const sendCurrentMessage = useCallback(() => {
    if (isSending) {
      addToQueue()
      return
    }
    if (!input.trim()) return
    onSend(buildCurrentMessage())
    resetInputState()
  }, [isSending, addToQueue, input, onSend, buildCurrentMessage, resetInputState])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = CHAT_INPUT_AUTO_HEIGHT
      textareaRef.current.style.height = textareaRef.current.scrollHeight + CHAT_INPUT_HEIGHT_UNIT
    }
  }, [input])

  const hasQueue = pendingQueue.length > 0
  const hasSelectedMentions = selectedMentions.length > 0

  return (
    <div className="border-t bg-card relative z-30" id={TOUR_STEP_IDS.STORYTELLER_CHAT}>
      <MentionChipBar
        mentions={selectedMentions}
        onRemove={id => setSelectedMentions(prev => prev.filter(m => m.id !== id))}
      />
      <ChatInputQueueBar
        pendingQueue={pendingQueue}
        onRemove={index => setPendingQueue(prev => prev.filter((_, i) => i !== index))}
      />

      <div className="p-4">
        {showMentions && (
          <ChatInputMentionPopover
            flatFilteredList={flatFilteredList}
            groupedMentions={groupedMentions}
            selectedIndex={selectedIndex}
            onSelect={insertMention}
          />
        )}

        <div className="relative flex items-end gap-2">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => {
                const value = e.target.value
                setInput(value)
                const lastWord = value.split(/\s/).pop() || ''
                if (lastWord.startsWith('@')) {
                  setShowMentions(true)
                  setMentionFilter(lastWord.substring(1))
                  setSelectedIndex(0)
                } else {
                  setShowMentions(false)
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                isSending ? 'Type to queue (Enter), double-Enter to send all...' : placeholder
              }
              className={cn(
                'min-h-[50px] max-h-[200px] resize-none pr-12 py-3 bg-secondary/20 border-border/50 focus:border-primary/40 transition-all font-medium text-base scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent rounded-xl',
                isSending && 'border-dashed border-primary/30'
              )}
            />
            {input.startsWith('/') && (
              <div className="absolute left-3 top-3 pointer-events-none">
                <span className="text-primary font-mono text-sm opacity-50">/</span>
              </div>
            )}
          </div>

          <ChatInputActions
            isSending={isSending}
            hasQueue={hasQueue}
            canSend={!!input.trim()}
            onStop={onStop}
            onFlushQueue={flushAndSend}
            onSendOrQueue={sendCurrentMessage}
          />
        </div>

        <div className="flex justify-between items-center mt-2 px-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/20">
              <span className="opacity-50">@</span>
              <span>Mention</span>
            </div>
            {hasSelectedMentions && (
              <div className="text-[10px] text-primary/70 font-medium">
                {selectedMentions.length} context{selectedMentions.length > 1 ? 's' : ''}
              </div>
            )}
            {isSending && (
              <div className="flex items-center gap-1.5 text-[10px] text-primary/70 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span>Processing</span>
              </div>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground/50 font-mono">
            {input.length}/{maxLength}
          </div>
        </div>
      </div>
    </div>
  )
}

export type { MentionItem } from '../core/mentions/types'
