import { z } from 'zod'
import { ensureZodOpenApi } from '@/shared/openapi/ensure-zod-openapi'
import { OpenApiApiKeyDefaultScope, OpenApiSchemaFieldNote, OpenApiSchemaName } from '@/shared/openapi/constants/openapi-wire'

ensureZodOpenApi()

/** POST /api-keys body — shared by route + OpenAPI registry. */
export const createApiKeyRequestSchema = z
  .object({
    name: z.string().min(1).max(100),
    scopes: z.array(z.string()).optional().default([OpenApiApiKeyDefaultScope.All]),
    expiresAt: z.string().datetime().optional(),
  })
  .openapi(OpenApiSchemaName.CreateApiKeyRequest)

export const apiKeyListItemSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    scopes: z.array(z.string()).nullable().optional(),
    expires_at: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    last_used_at: z.string().nullable().optional(),
    revoked_at: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi(OpenApiSchemaName.ApiKeyListItem)

export const apiKeyListResponseSchema = z
  .object({
    apiKeys: z.array(apiKeyListItemSchema),
  })
  .openapi(OpenApiSchemaName.ApiKeyListResponse)

export const apiKeyCreateResponseSchema = z
  .object({
    apiKey: apiKeyListItemSchema.extend({
      key: z.string().describe(OpenApiSchemaFieldNote.ApiKeyPlaintextOnce),
    }),
    message: z.string(),
  })
  .openapi(OpenApiSchemaName.ApiKeyCreateResponse)

export const apiKeyDeleteQuerySchema = z
  .object({
    id: z.string().uuid(),
  })
  .openapi(OpenApiSchemaName.ApiKeyDeleteQuery)
