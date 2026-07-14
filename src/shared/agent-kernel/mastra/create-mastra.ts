import type { Agent } from '@mastra/core/agent'
import type { MCPServerBase } from '@mastra/core/mcp'
import type { AnyWorkflow } from '@mastra/core/workflows'
import { Mastra } from '@mastra/core/mastra'
import { Observability, MastraStorageExporter } from '@mastra/observability'
import { PostgresStore } from '@mastra/pg'
import { PinoLogger } from '@mastra/loggers'
import { STORYTELLER_SCORERS } from '../scorers'
import { Workspace, LocalFilesystem } from '@mastra/core/workspace'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { SKILLS_DIR } from '../skills/skill-loader'
import {
  MASTRA_DATABASE_URL_WARNING,
  MASTRA_DIR_NAME,
  MASTRA_FALLBACK_DATABASE_URL,
  MASTRA_LOGGER_LEVEL,
  MASTRA_LOGGER_NAME,
  MASTRA_NESTED_SERVER_PACKAGE,
  MASTRA_OBSERVABILITY_SERVICE,
  MASTRA_SERIALIZATION_MAX_ARRAY_ITEMS,
  MASTRA_SERIALIZATION_MAX_ATTR_CHARS,
  MASTRA_SERIALIZATION_MAX_DEPTH,
  MASTRA_SERIALIZATION_MAX_KEYS,
  MASTRA_SERIALIZATION_MAX_TOTAL_CHARS,
  MASTRA_STORAGE_ID,
  NEXT_CONFIG_FILENAME,
  PACKAGE_JSON_FILENAME,
  PACKAGE_JSON_NAME_FIELD,
} from '@/shared/agent-kernel/constants/mastra-bootstrap'
import { FileEncoding } from '@/shared/data/constants/protocol'
import { readString, recordFromJson } from '@/shared/data/json-guards'

let serializationConfigured = false

/** Mastra Studio cwd is `.mastra/output` or `.../mastra/public` — not the repo root. */
function resolveProjectRoot(): string {
  const envRoot = process.env.MASTRA_PROJECT_ROOT?.trim()
  if (envRoot) {
    const resolved = path.resolve(envRoot)
    if (path.basename(resolved) === MASTRA_DIR_NAME) {
      return path.dirname(resolved)
    }
    return resolved
  }

  let dir = process.cwd()
  while (true) {
    const pkgPath = path.join(dir, PACKAGE_JSON_FILENAME)
    const isAppRoot =
      existsSync(pkgPath) &&
      existsSync(path.join(dir, NEXT_CONFIG_FILENAME)) &&
      !path.basename(dir).startsWith(MASTRA_DIR_NAME)

    if (isAppRoot) {
      try {
        const pkg: unknown = JSON.parse(readFileSync(pkgPath, FileEncoding.Utf8))
        const pkgName = readString(recordFromJson(pkg)[PACKAGE_JSON_NAME_FIELD])
        if (pkgName !== MASTRA_NESTED_SERVER_PACKAGE) return dir
      } catch {
        return dir
      }
    }

    const parent = path.dirname(dir)
    if (parent === dir) return process.cwd()
    dir = parent
  }
}

function configureSerializationLimits() {
  if (serializationConfigured) return

  process.env.MASTRA_SERIALIZATION_MAX_ATTR_CHARS = MASTRA_SERIALIZATION_MAX_ATTR_CHARS
  process.env.MASTRA_SERIALIZATION_MAX_DEPTH = MASTRA_SERIALIZATION_MAX_DEPTH
  process.env.MASTRA_SERIALIZATION_MAX_KEYS = MASTRA_SERIALIZATION_MAX_KEYS
  process.env.MASTRA_SERIALIZATION_MAX_ARRAY_ITEMS = MASTRA_SERIALIZATION_MAX_ARRAY_ITEMS
  process.env.MASTRA_SERIALIZATION_MAX_TOTAL_CHARS = MASTRA_SERIALIZATION_MAX_TOTAL_CHARS

  serializationConfigured = true
}

export function createPostgresStore(): PostgresStore {
  const dbUrl = process.env.DATABASE_URL

  if (!dbUrl) {
    console.warn(MASTRA_DATABASE_URL_WARNING)
  }

  return new PostgresStore({
    id: MASTRA_STORAGE_ID,
    connectionString: dbUrl || MASTRA_FALLBACK_DATABASE_URL,
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
    ...(storage
      ? {
          observability: new Observability({
            configs: {
              default: {
                serviceName: MASTRA_OBSERVABILITY_SERVICE,
                exporters: [new MastraStorageExporter()],
              },
            },
          }),
        }
      : {}),
  })
}
