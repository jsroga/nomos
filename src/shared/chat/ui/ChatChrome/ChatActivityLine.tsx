import { ChatChromeClass } from '@/shared/chat/core/utils/chat-chrome'

export function ChatActivityLine({ children }: { children: string }) {
  if (!children.trim()) return null
  return <p className={ChatChromeClass.Activity}>{children}</p>
}
