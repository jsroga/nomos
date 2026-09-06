import { NextRequest, NextResponse } from 'next/server'
import { ApiErrorMessage, HttpStatus } from '@/shared/data/constants/protocol'
import { readJsonBody } from '@/shared/data/fetch-json-record'
import { patchChatSessionBodySchema } from '@/shared/chat/core/io/chat-session-contract'
import { requireAuth } from '@/shared/auth/auth'
import { tryProjectScope } from '@/shared/auth/project-scope'
import {
  deleteOwnedChatSession,
  findOwnedChatSession,
  updateOwnedChatSession,
} from '@/shared/chat/core/io/chat-session-store'
import { overlayMemoryRef } from '@/shared/agent-kernel/mastra/memory-ref'
import { getStorageInstance } from '@/shared/agent-kernel/mastra-instance'
import { MastraStoreName } from '@/shared/agent-kernel/constants/agent-memory'

interface RouteContext {
  params: Promise<{ id: string }>
}

async function deleteOverlayThread(id: string, userId: string): Promise<void> {
  try {
    const bound = overlayMemoryRef({ id, userId })
    const memory = await getStorageInstance().getStore(MastraStoreName.Memory)
    if (!memory) return
    await memory.deleteThread({ threadId: bound.thread })
  } catch {
    // Best-effort: host row delete already succeeded.
  }
}

export async function GET(_req: NextRequest, context: RouteContext) {
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
  return NextResponse.json(row)
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { session } = await requireAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: ApiErrorMessage.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
  }
  const { id } = await context.params
  const parsed = patchChatSessionBodySchema.safeParse(await readJsonBody(req, null))
  if (!parsed.success) {
    return NextResponse.json({ error: ApiErrorMessage.INVALID_ACTION }, { status: HttpStatus.BAD_REQUEST })
  }
  const existing = await findOwnedChatSession({ id, userId: session.user.id })
  if (!existing) {
    return NextResponse.json({ error: ApiErrorMessage.PROJECT_NOT_FOUND }, { status: HttpStatus.NOT_FOUND })
  }
  if (!(await tryProjectScope(existing.projectId, session.user.id))) {
    return NextResponse.json({ error: ApiErrorMessage.PROJECT_NOT_FOUND }, { status: HttpStatus.NOT_FOUND })
  }
  const updated = await updateOwnedChatSession({
    id,
    userId: session.user.id,
    patch: parsed.data,
  })
  if (!updated) {
    return NextResponse.json({ error: ApiErrorMessage.PROJECT_NOT_FOUND }, { status: HttpStatus.NOT_FOUND })
  }
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { session } = await requireAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: ApiErrorMessage.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
  }
  const { id } = await context.params
  const existing = await findOwnedChatSession({ id, userId: session.user.id })
  if (!existing) {
    return NextResponse.json({ error: ApiErrorMessage.PROJECT_NOT_FOUND }, { status: HttpStatus.NOT_FOUND })
  }
  if (!(await tryProjectScope(existing.projectId, session.user.id))) {
    return NextResponse.json({ error: ApiErrorMessage.PROJECT_NOT_FOUND }, { status: HttpStatus.NOT_FOUND })
  }
  const deleted = await deleteOwnedChatSession({ id, userId: session.user.id })
  if (!deleted) {
    return NextResponse.json({ error: ApiErrorMessage.PROJECT_NOT_FOUND }, { status: HttpStatus.NOT_FOUND })
  }
  await deleteOverlayThread(id, session.user.id)
  return new NextResponse(null, { status: HttpStatus.NO_CONTENT })
}
