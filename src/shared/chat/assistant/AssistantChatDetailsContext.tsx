'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface AssistantChatDetailsValue {
  showDetails: boolean
  toggleDetails: () => void
}

const AssistantChatDetailsContext = createContext<AssistantChatDetailsValue>({
  showDetails: false,
  toggleDetails: () => undefined,
})

export function AssistantChatDetailsProvider({ children }: { children: ReactNode }) {
  const [showDetails, setShowDetails] = useState(false)
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
