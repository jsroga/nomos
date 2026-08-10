'use client'

import { createContext, useContext, type ReactNode } from 'react'

type AddToWorldHandler = ((text: string) => void) | undefined

const AssistantAddToWorldContext = createContext<AddToWorldHandler>(undefined)

export function AssistantAddToWorldProvider({
  onAddToWorld,
  children,
}: {
  onAddToWorld?: (text: string) => void
  children: ReactNode
}) {
  return (
    <AssistantAddToWorldContext.Provider value={onAddToWorld}>
      {children}
    </AssistantAddToWorldContext.Provider>
  )
}

export function useAssistantAddToWorld(): AddToWorldHandler {
  return useContext(AssistantAddToWorldContext)
}
