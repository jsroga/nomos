'use client'

import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/Button'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'
import { WorkspaceChatCopy } from './workspace-chat-copy'

export function WorkspaceChatToggle() {
  const toggleOverlay = useWorkspaceChatUiStore(state => state.toggleOverlay)
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => toggleOverlay()}
      title={WorkspaceChatCopy.ToggleAria}
      aria-label={WorkspaceChatCopy.ToggleAria}
      className="text-white/70 hover:bg-white/5 hover:text-white"
    >
      <MessageSquare size={18} />
    </Button>
  )
}
