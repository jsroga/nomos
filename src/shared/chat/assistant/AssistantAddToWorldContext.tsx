'use client'

import { createContext, useContext, type ReactNode } from 'react'

export interface AddToWorldPayload {
  text: string
  toolArgs: readonly Record<string, unknown>[]
}

export interface AssistantAddToWorldApi {
  onAddToWorld?: (payload: AddToWorldPayload) => boolean | Promise<boolean>
  sectionLabelsFromToolArgs?: (toolArgs: readonly Record<string, unknown>[]) => string[]
}

const AssistantAddToWorldContext = createContext<AssistantAddToWorldApi>({})

export function AssistantAddToWorldProvider({
  onAddToWorld,
  sectionLabelsFromToolArgs,
  children,
}: AssistantAddToWorldApi & { children: ReactNode }) {
  return (
    <AssistantAddToWorldContext.Provider value={{ onAddToWorld, sectionLabelsFromToolArgs }}>
      {children}
    </AssistantAddToWorldContext.Provider>
  )
}

export function useAssistantAddToWorld(): AssistantAddToWorldApi {
  return useContext(AssistantAddToWorldContext)
}
