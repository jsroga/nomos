import { z } from 'zod'
import { ensureZodOpenApi } from '@/shared/openapi/ensure-zod-openapi'
import { OpenApiJsonRpcVersion, OpenApiSchemaName } from '@/shared/openapi/constants/openapi-wire'

ensureZodOpenApi()

export const openApiJsonRpcRequestSchema = z
  .object({
    jsonrpc: z.literal(OpenApiJsonRpcVersion.V2),
    id: z.union([z.string(), z.number(), z.null()]).optional(),
    method: z.string(),
    params: z.record(z.unknown()).optional(),
  })
  .passthrough()
  .openapi(OpenApiSchemaName.McpJsonRpcRequest)

export const openApiJsonRpcResponseSchema = z
  .object({
    jsonrpc: z.literal(OpenApiJsonRpcVersion.V2),
    id: z.union([z.string(), z.number(), z.null()]).optional(),
    result: z.unknown().optional(),
    error: z
      .object({
        code: z.number(),
        message: z.string(),
        data: z.unknown().optional(),
      })
      .optional(),
  })
  .passthrough()
  .openapi(OpenApiSchemaName.McpJsonRpcResponse)
