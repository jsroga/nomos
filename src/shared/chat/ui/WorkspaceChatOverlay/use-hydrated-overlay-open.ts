'use client'

import { useLayoutEffect, useState } from 'react'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'
import { storedWorkspaceChatOverlayOpen } from '@/shared/chat/state/utils/workspace-chat-overlay-open'

function applyStoredOverlayOpen(): void {
  const stored = storedWorkspaceChatOverlayOpen()
  if (stored === null) return
  useWorkspaceChatUiStore.setState({ overlayOpen: stored })
}

/** Open on the SSR pass; layout then applies a stored closed/open flag. */
export function useHydratedWorkspaceChatOverlayOpen(): boolean {
  const overlayOpen = useWorkspaceChatUiStore(state => state.overlayOpen)
  const [hydrated, setHydrated] = useState(false)

  useLayoutEffect(() => {
    applyStoredOverlayOpen()
    setHydrated(true)
  }, [])

  return hydrated ? overlayOpen : true
}
