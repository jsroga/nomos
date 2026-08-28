/**
 * The one place `process.env` is read on the server.
 *
 * 63 variables were read from 74 files and 28 were written down, so a missing
 * one was not an error — `process.env.FOO` is `undefined`, and the failure
 * surfaced later as a 500, an empty model list, or a provider call with
 * `apiKey: undefined`, far from the cause and only on the path that read it.
 *
 * Parsing happens once at import, so a misconfigured environment fails at boot
 * naming every missing key at once.
 *
 * **No `server-only` marker, deliberately.** It was here and had to come out:
 * `shared/persistence/client.ts` reads `DATABASE_URL`, and the OpenAPI
 * generator loads that module under `tsx`, where `server-only` throws. The
 * guarantee it provided is not lost — `npm run build` fails on a client
 * component that reaches a server module, with a full import trace, and it
 * proved that by catching `chat-model-catalog.ts` during this migration.
 * `npm run precommit` runs that build, so the check is still enforced, just by
 * the compiler rather than by an import.
 *
 * Required vs optional is read off the call sites rather than judged: a bare
 * use or an existing throw means required, a `??` default means optional with
 * that default, and anything ambiguous resolves to optional. A wrong
 * `optional` is a familiar late failure; a wrong `required` will not start.
 */
import { z } from 'zod'
import { ENV_DEFAULT, ENV_PARSE_FAILED } from '@/shared/config/constants/env'

const serverEnvSchema = z.object({
  /**
   * Optional, on the evidence rather than on instinct. An earlier draft made
   * this the one required key, because `persistence/client.ts` fell back to
   * `''` — a connection that fails later with an unrelated message. But
   * `agent-kernel/mastra/create-mastra.ts` carries a documented
   * `MASTRA_FALLBACK_DATABASE_URL` and a `DATABASE_URL ? … : undefined`
   * branch, so the codebase genuinely runs without it and requiring it would
   * stop Mastra Studio booting.
   *
   * The improvement lands where it belongs instead: `persistence/client.ts`
   * now fails by name at the point of use rather than connecting to `''`.
   */
  DATABASE_URL: z.string().min(1).optional(),

  // Providers — each call site already tests for presence and degrades.
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  GOOGLE_API_KEY: z.string().min(1).optional(),
  APIFRAME_API_KEY: z.string().min(1).optional(),
  MESHY_API_KEY: z.string().min(1).optional(),
  HYPER3D_API_KEY: z.string().min(1).optional(),
  FAL_KEY: z.string().min(1).optional(),
  REPLICATE_API_TOKEN: z.string().min(1).optional(),
  TAVILY_API_KEY: z.string().min(1).optional(),

  // Storage and platform.
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Research integrations.
  REDDIT_CLIENT_ID: z.string().min(1).optional(),
  REDDIT_CLIENT_SECRET: z.string().min(1).optional(),
  TWITTER_BEARER_TOKEN: z.string().min(1).optional(),

  // MCP.
  MCP_API_KEY: z.string().min(1).optional(),
  DEV_USER_ID: z.string().min(1).optional(),

  // Models still read here; SPEC-13 Task 13 moves model resolution wholesale.
  EMBEDDING_MODEL: z.string().min(1).default(ENV_DEFAULT.EmbeddingModel),
  JUDGING_MODEL: z.string().min(1).optional(),
  STORYTELLER_CHAT_MODEL: z.string().min(1).optional(),

  // Mastra.
  MASTRA_PROJECT_ROOT: z.string().min(1).optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

function parseServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env)
  if (parsed.success) return parsed.data

  const missing = parsed.error.issues.map(issue => `  ${issue.path.join('.')}: ${issue.message}`)
  throw new Error(`${ENV_PARSE_FAILED}\n${missing.join('\n')}`)
}

export const env: ServerEnv = parseServerEnv()
