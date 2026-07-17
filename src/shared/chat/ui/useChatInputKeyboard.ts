import type React from 'react'
import { MentionItem } from '../core/mentions/types'
import { buildMessageWithContext } from '../core/mentions/context-builder'
import { CHAT_INPUT_AUTO_HEIGHT, ChatInputKey } from './constants/chat-input'

interface MentionNavigationParams {
  e: React.KeyboardEvent
  flatFilteredList: MentionItem[]
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  insertMention: (item: MentionItem) => void
  setShowMentions: (show: boolean) => void
}

function handleMentionNavigation(params: MentionNavigationParams): boolean {
  const { e, flatFilteredList, selectedIndex, setSelectedIndex, insertMention, setShowMentions } =
    params

  if (e.key === ChatInputKey.ArrowDown) {
    e.preventDefault()
    setSelectedIndex(prev => (prev + 1) % flatFilteredList.length)
    return true
  }
  if (e.key === ChatInputKey.ArrowUp) {
    e.preventDefault()
    setSelectedIndex(prev => (prev - 1 + flatFilteredList.length) % flatFilteredList.length)
    return true
  }
  if (e.key === ChatInputKey.Enter || e.key === ChatInputKey.Tab) {
    e.preventDefault()
    insertMention(flatFilteredList[selectedIndex])
    return true
  }
  if (e.key === ChatInputKey.Escape) {
    setShowMentions(false)
    return true
  }
  return false
}

interface EnterKeyParams {
  e: React.KeyboardEvent
  pendingQueue: string[]
  input: string
  isSending: boolean
  lastEnterTime: number
  setLastEnterTime: (time: number) => void
  flushAndSend: () => void
  addToQueue: () => void
  selectedMentions: MentionItem[]
  onSend: (message: string) => void
  setInput: (value: string) => void
  setSelectedMentions: React.Dispatch<React.SetStateAction<MentionItem[]>>
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}

function handleEnterKey(params: EnterKeyParams): void {
  const {
    e,
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
  } = params

  if (e.key !== ChatInputKey.Enter || e.shiftKey) return

  e.preventDefault()
  const now = Date.now()
  const timeSinceLastEnter = now - lastEnterTime
  setLastEnterTime(now)

  if (timeSinceLastEnter < 400 && (pendingQueue.length > 0 || input.trim())) {
    flushAndSend()
    return
  }

  if (isSending) {
    addToQueue()
    return
  }

  if (!input.trim()) return

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

interface KeyboardHandlerParams {
  showMentions: boolean
  flatFilteredList: MentionItem[]
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  insertMention: (item: MentionItem) => void
  setShowMentions: (show: boolean) => void
  pendingQueue: string[]
  input: string
  isSending: boolean
  lastEnterTime: number
  setLastEnterTime: (time: number) => void
  flushAndSend: () => void
  addToQueue: () => void
  selectedMentions: MentionItem[]
  onSend: (message: string) => void
  setInput: (value: string) => void
  setSelectedMentions: React.Dispatch<React.SetStateAction<MentionItem[]>>
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}

export function createChatInputKeyDownHandler(params: KeyboardHandlerParams) {
  return (e: React.KeyboardEvent) => {
    if (params.showMentions && params.flatFilteredList.length > 0) {
      if (
        handleMentionNavigation({
          e,
          flatFilteredList: params.flatFilteredList,
          selectedIndex: params.selectedIndex,
          setSelectedIndex: params.setSelectedIndex,
          insertMention: params.insertMention,
          setShowMentions: params.setShowMentions,
        })
      ) {
        return
      }
    }

    handleEnterKey({
      e,
      pendingQueue: params.pendingQueue,
      input: params.input,
      isSending: params.isSending,
      lastEnterTime: params.lastEnterTime,
      setLastEnterTime: params.setLastEnterTime,
      flushAndSend: params.flushAndSend,
      addToQueue: params.addToQueue,
      selectedMentions: params.selectedMentions,
      onSend: params.onSend,
      setInput: params.setInput,
      setSelectedMentions: params.setSelectedMentions,
      textareaRef: params.textareaRef,
    })
  }
}
