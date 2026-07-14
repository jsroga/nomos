'use client'

import React, { useRef, useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/Button'
import {
  Send,
  StopCircle,
  Command,
  X,
  CornerDownLeft,
  Database,
  Bot,
  FileText,
  User,
  Tv,
  Zap,
  Users,
  Cog,
  RefreshCw,
  GitBranch,
  PenTool,
  Building2,
  Map,
  AlertTriangle,
  FileEdit,
  Layout,
  Scale,
  TrendingUp,
  Scroll,
  Lightbulb,
  Music,
  Shuffle,
  BarChart,
  Gamepad2,
  LucideIcon,
} from 'lucide-react'
import { Textarea } from '@/components/Textarea'
import { cn } from '@/shared/data/utils'
import {
  MentionItem,
  MentionProvider,
  ProjectContext,
  MentionCategory,
  CATEGORY_META,
  TYPE_ICONS,
} from '../core/mentions/types'
import { buildMessageWithContext } from '../core/mentions/context-builder'
import { MentionChipBar } from './MentionChip'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { MentionCategoryId } from '../core/constants/mention-types'
import {
  CHAT_INPUT_AUTO_HEIGHT,
  CHAT_INPUT_DEFAULT_PLACEHOLDER,
  CHAT_INPUT_FETCH_MENTIONS_ERROR,
  CHAT_INPUT_HEIGHT_UNIT,
  ChatInputKey,
} from './constants/chat-input'

// Icon component map
const ICON_MAP: Record<string, LucideIcon> = {
  User,
  Bot,
  FileText,
  Tv,
  Zap,
  Users,
  Cog,
  RefreshCw,
  GitBranch,
  PenTool,
  Building2,
  Map,
  AlertTriangle,
  FileEdit,
  Layout,
  Scale,
  TrendingUp,
  Scroll,
  Lightbulb,
  Music,
  Shuffle,
  BarChart,
  Gamepad2,
  Database,
}

// Simple Chat Input with Cursor-like queue and generic mention system
interface ChatInputProps {
  onSend: (message: string) => void
  onStop?: () => void
  isSending: boolean
  placeholder?: string
  maxLength?: number
  /** Mention providers for domain-specific entities */
  mentionProviders?: MentionProvider[]
  /** Project context for mention providers */
  projectContext?: ProjectContext
  /** Legacy: Direct mention items (backwards compatible) */
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

  // Async fetch of mentions
  const [providerItems, setProviderItems] = useState<MentionItem[]>([])

  useEffect(() => {
    if (!projectContext && mentionProviders.length === 0) return

    let isMounted = true

    const fetchItems = async () => {
      try {
        const promises = mentionProviders.map(provider =>
          provider.getItems(mentionFilter, projectContext || { projectId: '' })
        )
        const results = await Promise.all(promises)
        if (isMounted) {
          setProviderItems(results.flat())
        }
      } catch (err) {
        console.error(CHAT_INPUT_FETCH_MENTIONS_ERROR, err)
      }
    }

    // Debounce the fetch if filter changes
    const timeoutId = setTimeout(fetchItems, 200)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [mentionProviders, projectContext, mentionFilter])

  // Combine fetched items with legacy items
  const allMentionItems = useMemo(() => {
    // Convert legacy mentions to new format
    const convertedLegacy: MentionItem[] = legacyMentions.map(m => ({
      ...m,
      category: MentionCategoryId.Entity,
    }))

    return [...providerItems, ...convertedLegacy]
  }, [providerItems, legacyMentions])

  // Filter and group mentions
  const filteredMentions = useMemo(() => {
    return allMentionItems
      .filter(m => m.name && m.name.toLowerCase().includes(mentionFilter.toLowerCase()))
      .slice(0, 12)
  }, [allMentionItems, mentionFilter])

  // Group filtered mentions by category
  const groupedMentions = useMemo(() => {
    const groups: Record<MentionCategory, MentionItem[]> = {
      entity: [],
      agent: [],
      section: [],
    }

    for (const item of filteredMentions) {
      const category = item.category || MentionCategoryId.Entity
      groups[category].push(item)
    }

    return groups
  }, [filteredMentions])

  // Flat list for keyboard navigation
  const flatFilteredList = useMemo(() => {
    return [...groupedMentions.entity, ...groupedMentions.agent, ...groupedMentions.section]
  }, [groupedMentions])

  // Send all queued messages + current input
  const flushAndSend = () => {
    const allMessages = [...pendingQueue]
    if (input.trim()) {
      // Build message with context from selected mentions
      const messageWithContext = buildMessageWithContext(
        input.trim(),
        selectedMentions.map((item, _i) => ({ item, startIndex: 0, endIndex: 0 }))
      )
      allMessages.push(messageWithContext)
    }

    if (allMessages.length === 0) return

    allMessages.forEach(msg => onSend(msg))

    setPendingQueue([])
    setInput('')
    setSelectedMentions([])

    if (textareaRef.current) {
      textareaRef.current.style.height = CHAT_INPUT_AUTO_HEIGHT
    }
  }

  // Add current input to queue
  const addToQueue = () => {
    if (!input.trim()) return

    const messageWithContext = buildMessageWithContext(
      input.trim(),
      selectedMentions.map(item => ({ item, startIndex: 0, endIndex: 0 }))
    )

    setPendingQueue(prev => [...prev, messageWithContext])
    setInput('')
    setSelectedMentions([])

    if (textareaRef.current) {
      textareaRef.current.style.height = CHAT_INPUT_AUTO_HEIGHT
    }
  }

  // Remove item from queue
  const removeFromQueue = (index: number) => {
    setPendingQueue(prev => prev.filter((_, i) => i !== index))
  }

  // Remove selected mention
  const removeSelectedMention = (id: string) => {
    setSelectedMentions(prev => prev.filter(m => m.id !== id))
  }

  const insertMention = (item: MentionItem) => {
    if (!item?.name) return
    const lastAtIndex = input.lastIndexOf('@')
    const newInput = input.substring(0, lastAtIndex) + '@' + item.name + ' '
    setInput(newInput)
    setShowMentions(false)
    setMentionFilter('')

    // Add to selected mentions if not already there
    if (!selectedMentions.find(m => m.id === item.id)) {
      setSelectedMentions(prev => [...prev, item])
    }

    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && flatFilteredList.length > 0) {
      if (e.key === ChatInputKey.ArrowDown) {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % flatFilteredList.length)
      } else if (e.key === ChatInputKey.ArrowUp) {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + flatFilteredList.length) % flatFilteredList.length)
      } else if (e.key === ChatInputKey.Enter || e.key === ChatInputKey.Tab) {
        e.preventDefault()
        insertMention(flatFilteredList[selectedIndex])
      } else if (e.key === ChatInputKey.Escape) {
        setShowMentions(false)
      }
      return
    }

    if (e.key === ChatInputKey.Enter && !e.shiftKey) {
      e.preventDefault()

      const now = Date.now()
      const timeSinceLastEnter = now - lastEnterTime
      setLastEnterTime(now)

      // Double Enter within 400ms = flush and send all
      if (timeSinceLastEnter < 400 && (pendingQueue.length > 0 || input.trim())) {
        flushAndSend()
        return
      }

      // If AI is working, add to queue instead of sending
      if (isSending) {
        addToQueue()
      } else {
        // If not sending, just send directly (single message)
        if (input.trim()) {
          const messageWithContext = buildMessageWithContext(
            input.trim(),
            selectedMentions.map(item => ({ item, startIndex: 0, endIndex: 0 }))
          )
          onSend(messageWithContext)
          setInput('')
          setSelectedMentions([])
          if (textareaRef.current) {
            textareaRef.current.style.height = CHAT_INPUT_AUTO_HEIGHT
          }
        }
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInput(value)

    // Check for @ mention trigger
    const lastWord = value.split(/\s/).pop() || ''

    if (lastWord.startsWith('@')) {
      setShowMentions(true)
      setMentionFilter(lastWord.substring(1))
      setSelectedIndex(0)
    } else {
      setShowMentions(false)
    }
  }

  // Auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = CHAT_INPUT_AUTO_HEIGHT
      textareaRef.current.style.height = textareaRef.current.scrollHeight + CHAT_INPUT_HEIGHT_UNIT
    }
  }, [input])

  const hasQueue = pendingQueue.length > 0
  const hasSelectedMentions = selectedMentions.length > 0

  // Render category section in popover
  const renderCategorySection = (category: MentionCategory, items: MentionItem[]) => {
    if (items.length === 0) return null

    const meta = CATEGORY_META[category]
    const CategoryIcon = ICON_MAP[meta.icon] || Database

    // Calculate global index offset for this category
    let indexOffset = 0
    if (category === MentionCategoryId.Agent) indexOffset = groupedMentions.entity.length
    if (category === MentionCategoryId.Section)
      indexOffset = groupedMentions.entity.length + groupedMentions.agent.length

    return (
      <div key={category}>
        <div className="px-3 py-1.5 bg-muted/20 border-b border-border/30 flex items-center gap-2">
          <CategoryIcon className="w-3 h-3 opacity-50" />
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
            {meta.label}
          </span>
        </div>
        {items.map((item, idx) => {
          const globalIdx = indexOffset + idx
          const iconName = item.icon || TYPE_ICONS[item.type] || 'Database'
          const ItemIcon = ICON_MAP[iconName] || Database

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => insertMention(item)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                globalIdx === selectedIndex
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted/50 text-foreground/80'
              )}
            >
              <div
                className={cn(
                  'p-1 rounded',
                  category === 'entity' && 'bg-blue-500/10',
                  category === 'agent' && 'bg-purple-500/10',
                  category === 'section' && 'bg-amber-500/10'
                )}
              >
                <ItemIcon
                  className={cn(
                    'w-3 h-3',
                    category === 'entity' && 'text-blue-400',
                    category === 'agent' && 'text-purple-400',
                    category === 'section' && 'text-amber-400'
                  )}
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-xs font-medium truncate">{item.name}</div>
                <div className="text-[9px] uppercase tracking-tighter opacity-50">
                  {item.type}
                  {item.preview && ` · ${item.preview}`}
                </div>
              </div>
              {globalIdx === selectedIndex && (
                <div className="text-[10px] opacity-50 font-mono">↵</div>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="border-t bg-card relative z-30" id={TOUR_STEP_IDS.STORYTELLER_CHAT}>
      {/* Selected Mentions Bar */}
      <MentionChipBar mentions={selectedMentions} onRemove={removeSelectedMention} />

      {/* Queue Bar - Visible when items queued */}
      {hasQueue && (
        <div className="px-4 py-2 border-b border-border/30 bg-muted/20 animate-in slide-in-from-bottom-1 duration-200">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Queued
            </span>
            <span className="text-[10px] text-muted-foreground/50 font-mono">
              ({pendingQueue.length})
            </span>
            <div className="flex-1" />
            <span className="text-[10px] text-muted-foreground/50">Double ↵ to send all</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pendingQueue.map((msg, idx) => (
              <div
                key={idx}
                className="group flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-foreground/80 max-w-[200px]"
              >
                <span className="truncate">{msg.length > 30 ? msg.slice(0, 30) + '...' : msg}</span>
                <button
                  type="button"
                  onClick={() => removeFromQueue(idx)}
                  className="opacity-50 hover:opacity-100 transition-opacity p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Mention Popover - Grouped by Category */}
        {showMentions && flatFilteredList.length > 0 && (
          <div className="absolute bottom-full left-4 mb-2 w-72 bg-card border border-border shadow-2xl rounded-lg overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="p-2 border-b border-border bg-muted/30 flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              <Command className="w-3 h-3" />
              <span>@ Reference</span>
              <span className="ml-auto opacity-50 font-mono">{flatFilteredList.length}</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {renderCategorySection(MentionCategoryId.Entity, groupedMentions.entity)}
              {renderCategorySection(MentionCategoryId.Agent, groupedMentions.agent)}
              {renderCategorySection(MentionCategoryId.Section, groupedMentions.section)}
            </div>
          </div>
        )}

        <div className="relative flex items-end gap-2">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
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

          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {isSending && onStop && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onStop}
                className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10"
                title="Stop generating"
              >
                <StopCircle className="h-3.5 w-3.5" />
              </Button>
            )}

            {hasQueue ? (
              <Button
                type="button"
                size="icon"
                onClick={flushAndSend}
                className="h-8 w-8 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
                title="Send all queued messages"
              >
                <CornerDownLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                onClick={() => {
                  if (isSending) {
                    addToQueue()
                  } else if (input.trim()) {
                    const messageWithContext = buildMessageWithContext(
                      input.trim(),
                      selectedMentions.map(item => ({ item, startIndex: 0, endIndex: 0 }))
                    )
                    onSend(messageWithContext)
                    setInput('')
                    setSelectedMentions([])
                  }
                }}
                disabled={!input.trim()}
                className={cn(
                  'h-8 w-8 rounded-full shadow-lg transition-all',
                  isSending
                    ? 'bg-muted/50 text-foreground border border-border/50 hover:bg-muted'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105'
                )}
                title={isSending ? 'Add to queue' : 'Send message'}
              >
                {isSending ? <Command className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </Button>
            )}
          </div>
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

// Re-export types for backwards compatibility
export type { MentionItem } from '../core/mentions/types'
