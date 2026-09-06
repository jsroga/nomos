import { overlayMemoryRef, type MemoryRef } from '@/shared/agent-kernel/mastra/memory-ref'
import { findOwnedChatSession } from '@/shared/chat/core/io/chat-session-store'

export async function bindOverlaySessionMemory(
  sessionId: string,
  userId: string,
): Promise<MemoryRef | null> {
  const owned = await findOwnedChatSession({ id: sessionId, userId })
  if (!owned) return null
  return overlayMemoryRef({ id: owned.id, userId })
}
