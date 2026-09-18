import type { ReactNode } from 'react'
import { cn } from '@/shared/data/utils'
import { ChatChromeClass } from '@/shared/chat/core/utils/chat-chrome'

export function ChatUserBubble({
  children,
  current = false,
}: {
  children: ReactNode
  current?: boolean
}) {
  return (
    <div className={ChatChromeClass.UserRow}>
      <div
        className={cn(
          ChatChromeClass.UserBubble,
          current ? ChatChromeClass.UserBubbleCurrent : undefined,
        )}
      >
        {children}
      </div>
    </div>
  )
}
