'use client'

/**
 * Tenant-injectable renderers for the chat platform (PLAN-V2 3.1 / D7).
 *
 * The platform renders CONVERSATION; domains own their markup semantics
 * (entity-reference chips, consistency payloads). Domains inject their
 * renderers via `ChatRenderersProvider` around their chat surface; without a
 * provider the defaults render plain text and skip domain payloads — the
 * platform never imports a domain component.
 */

import * as React from 'react'

export interface ChatRenderers {
  /** True when the text carries tenant markup that needs rich rendering. */
  hasRichMarkup: (text: string) => boolean
  /** Render tenant-marked text (e.g. entity-reference chips). */
  renderRichText: (
    text: string,
    opts: { projectId?: string; inline?: boolean }
  ) => React.ReactNode
  /** Render a domain-specific consistency payload (shape is tenant-owned). */
  renderConsistency?: (result: unknown, opts: { canUndo?: boolean }) => React.ReactNode
}

const DEFAULT_RENDERERS: ChatRenderers = {
  hasRichMarkup: () => false,
  renderRichText: text => text,
}

const ChatRenderersContext = React.createContext<ChatRenderers>(DEFAULT_RENDERERS)

export function ChatRenderersProvider({
  renderers,
  children,
}: {
  renderers: ChatRenderers
  children: React.ReactNode
}) {
  return (
    <ChatRenderersContext.Provider value={renderers}>{children}</ChatRenderersContext.Provider>
  )
}

export function useChatRenderers(): ChatRenderers {
  return React.useContext(ChatRenderersContext)
}
