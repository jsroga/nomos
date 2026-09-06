import { z } from 'zod'
import { ensureZodOpenApi } from '@/shared/openapi/ensure-zod-openapi'
import { OpenApiSchemaName } from '@/shared/openapi/constants/openapi-wire'
import { QueryParam } from '@/shared/data/constants/protocol'
import {
  chatSessionSchema,
  createChatSessionBodySchema,
  patchChatSessionBodySchema,
} from '@/shared/chat/core/io/chat-session-contract'

ensureZodOpenApi()

export const openApiChatSessionsQuerySchema = z
  .object({
    [QueryParam.ProjectId]: z.string().uuid(),
  })
  .openapi(OpenApiSchemaName.ChatSessionsQuery)

export const openApiChatSessionIdParamsSchema = z
  .object({
    id: z.string().uuid(),
  })
  .openapi(OpenApiSchemaName.ChatSessionIdParams)

export const openApiChatSessionSchema = chatSessionSchema.openapi(OpenApiSchemaName.ChatSession)

export const openApiChatSessionListSchema = z
  .array(openApiChatSessionSchema)
  .openapi(OpenApiSchemaName.ChatSessionList)

export const openApiCreateChatSessionRequestSchema = createChatSessionBodySchema.openapi(
  OpenApiSchemaName.ChatSessionCreateRequest,
)

export const openApiPatchChatSessionRequestSchema = patchChatSessionBodySchema.openapi(
  OpenApiSchemaName.ChatSessionPatchRequest,
)

export const openApiChatSessionMessagesResponseSchema = z
  .object({
    messages: z.array(z.unknown()),
  })
  .openapi(OpenApiSchemaName.ChatSessionMessagesResponse)
