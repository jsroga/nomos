'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AppModuleId } from '@/shared/data/constants/protocol'

export const ASSISTANT_CHAT_SHOW_DETAILS_DEFAULT = true

interface AssistantChatDetailsValue {
  showDetails: boolean
  toggleDetails: () => void
  moduleKey?: string
  useLogsLabel: boolean
}

const AssistantChatDetailsContext = createContext<AssistantChatDetailsValue>({
  showDetails: ASSISTANT_CHAT_SHOW_DETAILS_DEFAULT,
  toggleDetails: () => undefined,
  useLogsLabel: false,
})

function defaultShowDetails(moduleKey?: string): boolean {
  if (moduleKey === AppModuleId.LoopCreator) return false
  return ASSISTANT_CHAT_SHOW_DETAILS_DEFAULT
}

export function AssistantChatDetailsProvider({
  children,
  moduleKey,
}: {
  children: ReactNode
  moduleKey?: string
}) {
  const [showDetails, setShowDetails] = useState(() => defaultShowDetails(moduleKey))
  const toggleDetails = useCallback(() => {
    setShowDetails(current => !current)
  }, [])
  const useLogsLabel = moduleKey === AppModuleId.LoopCreator
  const value = useMemo(
    () => ({ showDetails, toggleDetails, moduleKey, useLogsLabel }),
    [showDetails, toggleDetails, moduleKey, useLogsLabel],
  )

  return (
    <AssistantChatDetailsContext.Provider value={value}>
      {children}
    </AssistantChatDetailsContext.Provider>
  )
}

export function useAssistantChatDetails(): AssistantChatDetailsValue {
  return useContext(AssistantChatDetailsContext)
}
