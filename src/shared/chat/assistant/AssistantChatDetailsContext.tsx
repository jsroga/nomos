'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export const ASSISTANT_CHAT_SHOW_DETAILS_DEFAULT = true

interface AssistantChatDetailsValue {
  showDetails: boolean
  toggleDetails: () => void
}

const AssistantChatDetailsContext = createContext<AssistantChatDetailsValue>({
  showDetails: ASSISTANT_CHAT_SHOW_DETAILS_DEFAULT,
  toggleDetails: () => undefined,
})

export function AssistantChatDetailsProvider({ children }: { children: ReactNode }) {
  const [showDetails, setShowDetails] = useState(ASSISTANT_CHAT_SHOW_DETAILS_DEFAULT)
  const toggleDetails = useCallback(() => {
    setShowDetails(current => !current)
  }, [])
  const value = useMemo(
    () => ({ showDetails, toggleDetails }),
    [showDetails, toggleDetails],
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
