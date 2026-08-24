import { z } from 'zod'
import { ensureZodOpenApi } from '@/shared/openapi/ensure-zod-openapi'
import { OpenApiSchemaFieldNote, OpenApiSchemaName } from '@/shared/openapi/constants/openapi-wire'

ensureZodOpenApi()

export const openApiJobRunParamsSchema = z.object({
  runId: z.string().describe(OpenApiSchemaFieldNote.JobRunId),
}).openapi(OpenApiSchemaName.JobRunParams)

export const openApiJobRunResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  output: z.unknown().optional(),
  error: z.unknown().optional(),
  metadata: z.unknown().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
}).openapi(OpenApiSchemaName.JobRunResponse)
