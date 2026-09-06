import { z } from 'zod'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import {
  ChatSessionBodyKey,
  ChatSessionColumn,
  ChatSessionCopy,
  ChatSessionStatus,
  ChatSessionTitleLimit,
  ChatSessionWire,
} from '@/shared/chat/core/constants/chat-session'

export const createChatSessionBodySchema = z
  .object({
    [ChatSessionBodyKey.ProjectId]: z.string().uuid(),
    [ChatSessionBodyKey.ModuleId]: z.nativeEnum(AppModuleId),
  })
  .strict()

export const patchChatSessionBodySchema = z
  .object({
    [ChatSessionBodyKey.Title]: z.string().trim().min(1).max(ChatSessionTitleLimit.MaxChars).optional(),
    [ChatSessionBodyKey.Status]: z.nativeEnum(ChatSessionStatus).optional(),
    [ChatSessionBodyKey.RunId]: z.string().nullable().optional(),
  })
  .strict()

export const chatSessionSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().min(1),
  moduleId: z.nativeEnum(AppModuleId),
  thread: z.string().min(1),
  resource: z.string().min(1),
  title: z.string(),
  titleLocked: z.boolean(),
  status: z.nativeEnum(ChatSessionStatus),
  runId: z.string().nullable(),
  wire: z.nativeEnum(ChatSessionWire),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const chatSessionListSchema = z.array(chatSessionSchema)

export type ChatSession = z.infer<typeof chatSessionSchema>
export type CreateChatSessionBody = z.infer<typeof createChatSessionBodySchema>
export type PatchChatSessionBody = z.infer<typeof patchChatSessionBodySchema>

function isAppModuleId(value: unknown): value is AppModuleId {
  switch (value) {
    case AppModuleId.Storyteller:
    case AppModuleId.LoopCreator:
    case AppModuleId.InteriorDesigner:
    case AppModuleId.WorldBuilding:
    case AppModuleId.AssetExporter:
      return true
    default:
      return false
  }
}

function isChatSessionStatus(value: unknown): value is ChatSessionStatus {
  switch (value) {
    case ChatSessionStatus.Idle:
    case ChatSessionStatus.Streaming:
    case ChatSessionStatus.Suspended:
      return true
    default:
      return false
  }
}

function isChatSessionWire(value: unknown): value is ChatSessionWire {
  return value === ChatSessionWire.AiSdk
}

function readTimestamp(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString()
  return readString(value)
}

function readLocked(value: unknown): boolean {
  return value === true
}

/** Snake_case SQL/jsonb → session DTO. Camel keys are ignored. */
export function chatSessionFromSql(value: unknown): ChatSession | null {
  const row = recordFromJson(value)
  const parsed = chatSessionSchema.safeParse({
    id: readString(row[ChatSessionColumn.Id]),
    projectId: readString(row[ChatSessionColumn.ProjectId]),
    userId: readString(row[ChatSessionColumn.UserId]),
    moduleId: isAppModuleId(row[ChatSessionColumn.ModuleId]) ? row[ChatSessionColumn.ModuleId] : undefined,
    thread: readString(row[ChatSessionColumn.Thread]),
    resource: readString(row[ChatSessionColumn.Resource]),
    title: readString(row[ChatSessionColumn.Title]) ?? ChatSessionCopy.PlaceholderTitle,
    titleLocked: readLocked(row[ChatSessionColumn.TitleLocked]),
    status: isChatSessionStatus(row[ChatSessionColumn.Status]) ? row[ChatSessionColumn.Status] : undefined,
    runId: readString(row[ChatSessionColumn.RunId]) ?? null,
    wire: isChatSessionWire(row[ChatSessionColumn.Wire]) ? row[ChatSessionColumn.Wire] : undefined,
    createdAt: readTimestamp(row[ChatSessionColumn.CreatedAt]),
    updatedAt: readTimestamp(row[ChatSessionColumn.UpdatedAt]),
  })
  return parsed.success ? parsed.data : null
}

export function chatSessionFromDrizzle(row: {
  id: string
  projectId: string
  userId: string
  moduleId: string
  thread: string
  resource: string
  title: string
  titleLocked: boolean
  status: string
  runId: string | null
  wire: string
  createdAt: Date
  updatedAt: Date
}): ChatSession | null {
  return chatSessionFromSql({
    [ChatSessionColumn.Id]: row.id,
    [ChatSessionColumn.ProjectId]: row.projectId,
    [ChatSessionColumn.UserId]: row.userId,
    [ChatSessionColumn.ModuleId]: row.moduleId,
    [ChatSessionColumn.Thread]: row.thread,
    [ChatSessionColumn.Resource]: row.resource,
    [ChatSessionColumn.Title]: row.title,
    [ChatSessionColumn.TitleLocked]: row.titleLocked,
    [ChatSessionColumn.Status]: row.status,
    [ChatSessionColumn.RunId]: row.runId,
    [ChatSessionColumn.Wire]: row.wire,
    [ChatSessionColumn.CreatedAt]: row.createdAt,
    [ChatSessionColumn.UpdatedAt]: row.updatedAt,
  })
}
