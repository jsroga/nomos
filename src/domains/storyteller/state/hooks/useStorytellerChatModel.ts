'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_CHAT_MODEL,
  USER_SELECTABLE_CHAT_MODELS,
  isKnownChatModel,
  type ChatModelOption,
} from '@/domains/storyteller/config/constants/chat-model-catalog'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'

export type StorytellerChatModelChoice = Pick<ChatModelOption, 'id' | 'label'>

const SELECTABLE_CHOICES: StorytellerChatModelChoice[] = USER_SELECTABLE_CHAT_MODELS.map(
  option => ({ id: option.id, label: option.label }),
)

function readStoredChatModel(): string {
  if (typeof window === 'undefined') return DEFAULT_CHAT_MODEL
  const stored = window.localStorage.getItem(LocalStorageKeys.STORYTELLER_CHAT_MODEL)
  if (stored && isKnownChatModel(stored)) return stored
  return DEFAULT_CHAT_MODEL
}

/** Writers Room chat model picker — persists to localStorage. */
export function useStorytellerChatModel() {
  const [modelId, setModelIdState] = useState(DEFAULT_CHAT_MODEL)

  useEffect(() => {
    setModelIdState(readStoredChatModel())
  }, [])

  const setModelId = useCallback((next: string) => {
    if (!isKnownChatModel(next)) return
    setModelIdState(next)
    window.localStorage.setItem(LocalStorageKeys.STORYTELLER_CHAT_MODEL, next)
  }, [])

  return {
    modelId,
    setModelId,
    options: SELECTABLE_CHOICES,
  }
}
