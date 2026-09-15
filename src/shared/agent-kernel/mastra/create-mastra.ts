import { env } from '@/shared/config/env'
import type { Agent } from '@mastra/core/agent'
import type { MCPServerBase } from '@mastra/core/mcp'
import type { AnyWorkflow } from '@mastra/core/workflows'
import { Mastra, type Config } from '@mastra/core/mastra'
import { MastraEditor } from '@mastra/editor'
import { PostgresStore, PostgresStoreVNext } from '@mastra/pg'
import { MastraEditorSource } from './constants/editor'
import { listStoredScorerIds, resolveEditorCodePath } from './editor-overlay'
import { createObservability } from './observability-config'
import { omitStoredJudgeCodeScorers } from '../scorers/studio-scorers'
import { PinoLogger } from '@mastra/loggers'
import { STORYTELLER_SCORERS } from '../scorers'
import { registerCorePrompts, registerGameDesignPrompts } from '@/shared/agent-kernel/prompts/registry'
import {
  MASTRA_DATABASE_URL_WARNING,
  MASTRA_FALLBACK_DATABASE_URL,
  MASTRA_LOGGER_LEVEL,
  MASTRA_LOGGER_NAME,
  MASTRA_SERIALIZATION_MAX_ARRAY_ITEMS,
  MASTRA_SERIALIZATION_MAX_ATTR_CHARS,
  MASTRA_SERIALIZATION_MAX_DEPTH,
  MASTRA_SERIALIZATION_MAX_KEYS,
  MASTRA_SERIALIZATION_MAX_TOTAL_CHARS,
  MASTRA_STORAGE_ID,
  MastraObservabilityDatabaseEnv,
} from '@/shared/agent-kernel/constants/mastra-bootstrap'
import { createInstanceStudioWorkspace } from '@/shared/agent-kernel/mastra/studio-workspace'
import {
  postgresSsl,
  stripPostgresSslQueryParams,
} from '../../persistence/postgres-ssl'

let serializationConfigured = false

function configureSerializationLimits() {
  if (serializationConfigured) return

  process.env.MASTRA_SERIALIZATION_MAX_ATTR_CHARS = MASTRA_SERIALIZATION_MAX_ATTR_CHARS
  process.env.MASTRA_SERIALIZATION_MAX_DEPTH = MASTRA_SERIALIZATION_MAX_DEPTH
  process.env.MASTRA_SERIALIZATION_MAX_KEYS = MASTRA_SERIALIZATION_MAX_KEYS
  process.env.MASTRA_SERIALIZATION_MAX_ARRAY_ITEMS = MASTRA_SERIALIZATION_MAX_ARRAY_ITEMS
  process.env.MASTRA_SERIALIZATION_MAX_TOTAL_CHARS = MASTRA_SERIALIZATION_MAX_TOTAL_CHARS

  serializationConfigured = true
}

function resolveDatabaseUrl(): string {
  return env.DATABASE_URL || MASTRA_FALLBACK_DATABASE_URL
}

function resolveObservabilityDatabaseUrl(primaryUrl: string): string {
  const dedicated = process.env[MastraObservabilityDatabaseEnv.Url]?.trim()
  return dedicated || primaryUrl
}

/**
 * Mastra storage with vNext observability (Studio discovery / feedback /
 * metrics). Legacy `PostgresStore` stubs those APIs and Studio logs errors.
 */
export function createPostgresStore(): PostgresStore {
  const dbUrl = env.DATABASE_URL

  if (!dbUrl) {
    console.warn(MASTRA_DATABASE_URL_WARNING)
  }

  const ssl = postgresSsl()
  const primaryUrl = stripPostgresSslQueryParams(resolveDatabaseUrl())
  return new PostgresStoreVNext({
    id: MASTRA_STORAGE_ID,
    connectionString: primaryUrl,
    ssl,
    observability: {
      connectionString: stripPostgresSslQueryParams(
        resolveObservabilityDatabaseUrl(primaryUrl),
      ),
      ssl,
    },
  })
}

export function createMastra(
  agents: Record<string, Agent>,
  options?: {
    storage?: PostgresStore | null
    mcpServers?: Record<string, MCPServerBase>
    workflows?: Record<string, AnyWorkflow>
    tools?: Config['tools']
    server?: Config['server']
  },
): Mastra {
  configureSerializationLimits()
  registerCorePrompts()
  registerGameDesignPrompts()

  const workspace = createInstanceStudioWorkspace()

  const storage =
    options?.storage === null
      ? undefined
      : options?.storage ?? (env.DATABASE_URL ? createPostgresStore() : undefined)

  const observability = createObservability({ hasStorage: Boolean(storage) })

  return new Mastra({
    agents,
    scorers: omitStoredJudgeCodeScorers(STORYTELLER_SCORERS, listStoredScorerIds()),
    ...(storage ? { storage } : {}),
    ...(workspace ? { workspace } : {}),
    ...(options?.workflows ? { workflows: options.workflows } : {}),
    ...(options?.mcpServers ? { mcpServers: options.mcpServers } : {}),
    ...(options?.tools ? { tools: options.tools } : {}),
    ...(options?.server ? { server: options.server } : {}),
    editor: new MastraEditor({
      source: MastraEditorSource.Code,
      codePath: resolveEditorCodePath(),
    }),
    logger: new PinoLogger({
      name: MASTRA_LOGGER_NAME,
      level: MASTRA_LOGGER_LEVEL,
    }),
    ...(observability ? { observability } : {}),
  })
}
