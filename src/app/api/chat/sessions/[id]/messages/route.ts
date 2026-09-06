import { NextResponse } from 'next/server'
import { ApiErrorMessage, HttpStatus } from '@/shared/data/constants/protocol'
import { requireAuth } from '@/shared/auth/auth'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { ChatSessionsApiSegment } from '@/shared/chat/core/constants/chat-session'
import { findOwnedChatSession } from '@/shared/chat/core/io/chat-session-store'
import { overlayMemoryRef } from '@/shared/agent-kernel/mastra/memory-ref'
import { getStorageInstance } from '@/shared/agent-kernel/mastra-instance'
import { MastraStoreName } from '@/shared/agent-kernel/constants/agent-memory'

interface RouteContext {
  params: Promise<{ id: string }>
}

async function listThreadMessages(thread: string, resource: string): Promise<unknown[]> {
  try {
    const memory = await getStorageInstance().getStore(MastraStoreName.Memory)
    if (!memory) return []
    const result = await memory.listMessages({ threadId: thread, resourceId: resource })
    if (!result || typeof result !== 'object') return []
    const messages = Reflect.get(result, ChatSessionsApiSegment.Messages)
    return Array.isArray(messages) ? messages : []
  } catch {
    return []
  }
}

export async function GET(_req: Request, context: RouteContext) {
  const { session } = await requireAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: ApiErrorMessage.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
  }
  const { id } = await context.params
  const row = await findOwnedChatSession({ id, userId: session.user.id })
  if (!row) {
    return NextResponse.json({ error: ApiErrorMessage.PROJECT_NOT_FOUND }, { status: HttpStatus.NOT_FOUND })
  }
  if (!(await tryProjectScope(row.projectId, session.user.id))) {
    return NextResponse.json({ error: ApiErrorMessage.PROJECT_NOT_FOUND }, { status: HttpStatus.NOT_FOUND })
  }
  const bound = overlayMemoryRef({ id: row.id, userId: session.user.id })
  const messages = await listThreadMessages(bound.thread, bound.resource)
  return NextResponse.json({ [ChatSessionsApiSegment.Messages]: messages })
}
