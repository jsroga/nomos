import type { Agent } from '@mastra/core/agent'
import type { MCPServerBase } from '@mastra/core/mcp'
import type { AnyWorkflow } from '@mastra/core/workflows'
import { Mastra } from '@mastra/core/mastra'
import { PostgresStore, PostgresStoreVNext } from '@mastra/pg'
import { createObservability } from './observability-config'
import { PinoLogger } from '@mastra/loggers'
import { STORYTELLER_SCORERS } from '../scorers'
import { Workspace, LocalFilesystem } from '@mastra/core/workspace'
import path from 'path'
import { SKILLS_DIR } from '../skills/skill-loader'
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
import { resolveProjectRoot } from '@/shared/agent-kernel/mastra/project-root'

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
  return process.env.DATABASE_URL || MASTRA_FALLBACK_DATABASE_URL
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
  const dbUrl = process.env.DATABASE_URL

  if (!dbUrl) {
    console.warn(MASTRA_DATABASE_URL_WARNING)
  }

  const primaryUrl = resolveDatabaseUrl()
  return new PostgresStoreVNext({
    id: MASTRA_STORAGE_ID,
    connectionString: primaryUrl,
    observability: {
      connectionString: resolveObservabilityDatabaseUrl(primaryUrl),
    },
  })
}

export function createMastra(
  agents: Record<string, Agent>,
  options?: {
    storage?: PostgresStore | null
    mcpServers?: Record<string, MCPServerBase>
    workflows?: Record<string, AnyWorkflow>
  },
): Mastra {
  configureSerializationLimits()

  const projectRoot = resolveProjectRoot()

  const workspace = new Workspace({
    filesystem: new LocalFilesystem({
      basePath: projectRoot,
    }),
    skills: [path.join(projectRoot, SKILLS_DIR)],
  })

  const storage =
    options?.storage === null
      ? undefined
      : options?.storage ?? (process.env.DATABASE_URL ? createPostgresStore() : undefined)

  const observability = createObservability({ hasStorage: Boolean(storage) })

  return new Mastra({
    agents,
    scorers: STORYTELLER_SCORERS,
    ...(storage ? { storage } : {}),
    workspace,
    ...(options?.workflows ? { workflows: options.workflows } : {}),
    ...(options?.mcpServers ? { mcpServers: options.mcpServers } : {}),
    logger: new PinoLogger({
      name: MASTRA_LOGGER_NAME,
      level: MASTRA_LOGGER_LEVEL,
    }),
    ...(observability ? { observability } : {}),
  })
}
