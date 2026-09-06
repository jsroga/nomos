'use client'

import { useMemo } from 'react'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { isLoopCreatorEnabled } from '@/shared/data/constants/feature-flags'
import { getStorytellerChatAdapter } from '@/domains/storyteller'
import { getLoopCreatorChatAdapter } from '@/domains/loop-creator'
import { WorkspaceChatOverlay } from '@/shared/chat/ui/WorkspaceChatOverlay/WorkspaceChatOverlay'
import type { ModuleChatAdapter } from '@/shared/chat/overlay/module-chat-adapters'

export function WorkspaceChatLayer() {
  const adapters = useMemo(() => {
    const next: Partial<Record<AppModuleId, ModuleChatAdapter>> = {
      [AppModuleId.Storyteller]: getStorytellerChatAdapter(),
    }
    if (isLoopCreatorEnabled()) {
      next[AppModuleId.LoopCreator] = getLoopCreatorChatAdapter()
    }
    return next
  }, [])

  return <WorkspaceChatOverlay adapters={adapters} />
}
