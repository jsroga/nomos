import { and, desc, eq } from 'drizzle-orm'
import { chatSessions } from '@/db/schema'
import { db } from '@/shared/persistence'
import { overlayMemoryRef } from '@/shared/agent-kernel/mastra/memory-ref'
import { AppModuleId } from '@/shared/data/constants/protocol'
import {
  ChatSessionCopy,
  ChatSessionStatus,
  ChatSessionWire,
} from '@/shared/chat/core/constants/chat-session'
import {
  chatSessionFromDrizzle,
  type ChatSession,
  type PatchChatSessionBody,
} from '@/shared/chat/core/io/chat-session-contract'

export async function listOwnedChatSessions(input: {
  projectId: string
  userId: string
}): Promise<ChatSession[]> {
  const rows = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.projectId, input.projectId), eq(chatSessions.userId, input.userId)))
    .orderBy(desc(chatSessions.updatedAt))
  const out: ChatSession[] = []
  for (const row of rows) {
    const mapped = chatSessionFromDrizzle(row)
    if (mapped) out.push(mapped)
  }
  return out
}

export async function findOwnedChatSession(input: {
  id: string
  userId: string
}): Promise<ChatSession | null> {
  const rows = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, input.id), eq(chatSessions.userId, input.userId)))
  const row = rows[0]
  return row ? chatSessionFromDrizzle(row) : null
}

export async function insertChatSession(input: {
  id: string
  projectId: string
  userId: string
  moduleId: AppModuleId
}): Promise<ChatSession | null> {
  const bound = overlayMemoryRef({ id: input.id, userId: input.userId })
  const [row] = await db
    .insert(chatSessions)
    .values({
      id: input.id,
      projectId: input.projectId,
      userId: input.userId,
      moduleId: input.moduleId,
      thread: bound.thread,
      resource: bound.resource,
      title: ChatSessionCopy.PlaceholderTitle,
      titleLocked: false,
      status: ChatSessionStatus.Idle,
      runId: null,
      wire: ChatSessionWire.AiSdk,
    })
    .returning()
  return row ? chatSessionFromDrizzle(row) : null
}

export async function updateOwnedChatSession(input: {
  id: string
  userId: string
  patch: PatchChatSessionBody
}): Promise<ChatSession | null> {
  const existing = await findOwnedChatSession({ id: input.id, userId: input.userId })
  if (!existing) return null
  const title = input.patch.title
  const [row] = await db
    .update(chatSessions)
    .set({
      ...(title !== undefined ? { title, titleLocked: true } : {}),
      ...(input.patch.status !== undefined ? { status: input.patch.status } : {}),
      ...(input.patch.runId !== undefined ? { runId: input.patch.runId } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(chatSessions.id, input.id), eq(chatSessions.userId, input.userId)))
    .returning()
  return row ? chatSessionFromDrizzle(row) : null
}

export async function applyGeneratedChatSessionTitle(input: {
  id: string
  userId: string
  title: string
}): Promise<ChatSession | null> {
  const existing = await findOwnedChatSession({ id: input.id, userId: input.userId })
  if (!existing) return null
  if (existing.titleLocked) return existing
  if (existing.title !== ChatSessionCopy.PlaceholderTitle) return existing
  const [row] = await db
    .update(chatSessions)
    .set({ title: input.title, updatedAt: new Date() })
    .where(
      and(
        eq(chatSessions.id, input.id),
        eq(chatSessions.userId, input.userId),
        eq(chatSessions.titleLocked, false),
        eq(chatSessions.title, ChatSessionCopy.PlaceholderTitle),
      ),
    )
    .returning()
  return row ? chatSessionFromDrizzle(row) : existing
}

export async function deleteOwnedChatSession(input: { id: string; userId: string }): Promise<boolean> {
  const existing = await findOwnedChatSession({ id: input.id, userId: input.userId })
  if (!existing) return false
  await db
    .delete(chatSessions)
    .where(and(eq(chatSessions.id, input.id), eq(chatSessions.userId, input.userId)))
  return true
}
