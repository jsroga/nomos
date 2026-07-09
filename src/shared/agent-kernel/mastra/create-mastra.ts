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

let serializationConfigured = false

/** Mastra Studio cwd is `.mastra/output` or `.../mastra/public` — not the repo root. */
function resolveProjectRoot(): string {
  const envRoot = process.env.MASTRA_PROJECT_ROOT?.trim()
  if (envRoot) {
    const resolved = path.resolve(envRoot)
    // Mastra CLI sets MASTRA_PROJECT_ROOT to <repo>/.mastra — browse the app repo instead
    if (path.basename(resolved) === '.mastra') {
      return path.dirname(resolved)
    }
    return resolved
  }

  let dir = process.cwd()
  while (true) {
    const pkgPath = path.join(dir, 'package.json')
    const isAppRoot =
      existsSync(pkgPath) &&
      existsSync(path.join(dir, 'next.config.js')) &&
      !path.basename(dir).startsWith('.mastra')

    if (isAppRoot) {
      try {
        const pkg: unknown = JSON.parse(readFileSync(pkgPath, 'utf8'))
        // Mastra build emits a nested "server" package under .mastra/output
        const pkgName =
          typeof pkg === 'object' && pkg !== null && 'name' in pkg ? pkg.name : undefined
        if (pkgName !== 'server') return dir
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

  process.env.MASTRA_SERIALIZATION_MAX_ATTR_CHARS = '100000'
  process.env.MASTRA_SERIALIZATION_MAX_DEPTH = '20'
  process.env.MASTRA_SERIALIZATION_MAX_KEYS = '500'
  process.env.MASTRA_SERIALIZATION_MAX_ARRAY_ITEMS = '500'
  process.env.MASTRA_SERIALIZATION_MAX_TOTAL_CHARS = '1000000'

  serializationConfigured = true
}

export function createPostgresStore(): PostgresStore {
  const dbUrl = process.env.DATABASE_URL

  if (!dbUrl) {
    console.warn('⚠️ [Mastra] DATABASE_URL is not set. Memory persistence might fail if storage is required.')
  }

  return new PostgresStore({
    id: 'storyteller-storage',
    connectionString: dbUrl || 'postgresql://postgres:postgres@localhost:5432/postgres',
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
      name: 'Mastra',
      level: 'info',
    }),
    ...(storage
      ? {
          observability: new Observability({
            configs: {
              default: {
                serviceName: 'storyteller',
                exporters: [new MastraStorageExporter()],
              },
            },
          }),
        }
      : {}),
  })
}
