'use client'

import { createContext, useContext, type ReactNode } from 'react'

export type AssistantChatActions = {
  regenerate: () => Promise<void>
}

const AssistantChatActionsContext = createContext<AssistantChatActions | null>(null)

export function AssistantChatActionsProvider({
  actions,
  children,
}: {
  actions: AssistantChatActions
  children: ReactNode
}) {
  return (
    <AssistantChatActionsContext.Provider value={actions}>
      {children}
    </AssistantChatActionsContext.Provider>
  )
}

export function useAssistantChatActions(): AssistantChatActions | null {
  return useContext(AssistantChatActionsContext)
}
