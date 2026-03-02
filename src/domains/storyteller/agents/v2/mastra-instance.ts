import { Mastra } from '@mastra/core/mastra'
import { LangfuseExporter } from '@mastra/langfuse'
import { PostgresStore } from '@mastra/pg'
import { PinoLogger } from '@mastra/loggers'
import { Observability } from '@mastra/observability'
import { Workspace, LocalFilesystem } from '@mastra/core/workspace'

let mastraInstance: Mastra | null = null
let storageInstance: PostgresStore | null = null
let serializationConfigured = false

/**
 * Configure serialization limits via environment variables
 * Mastra reads these at runtime to control context truncation in observability
 * Note: Direct patching of frozen DEFAULT_SERIALIZATION_LIMITS is not possible
 */
function configureSerializationLimits() {
  if (serializationConfigured) return

  // Set environment variables that Mastra reads for serialization limits
  // These are read by @mastra/core/ai-tracing at runtime
  process.env.MASTRA_SERIALIZATION_MAX_ATTR_CHARS = '100000'
  process.env.MASTRA_SERIALIZATION_MAX_DEPTH = '20'
  process.env.MASTRA_SERIALIZATION_MAX_KEYS = '500'
  process.env.MASTRA_SERIALIZATION_MAX_ARRAY_ITEMS = '500'
  process.env.MASTRA_SERIALIZATION_MAX_TOTAL_CHARS = '1000000'

  serializationConfigured = true
}

/**
 * Get or create Postgres storage instance for memory persistence
 * See: https://mastra.ai/docs/agents/agent-memory
 */
export function getStorageInstance(): PostgresStore {
  if (!storageInstance) {
    const dbUrl = process.env.DATABASE_URL

    if (!dbUrl) {
      console.warn('⚠️ [Mastra] DATABASE_URL is not set. Memory persistence might fail if storage is required.')
    }

    storageInstance = new PostgresStore({
      id: 'storyteller-storage',
      connectionString: dbUrl || 'postgresql://postgres:postgres@localhost:5432/postgres',
    })

    console.log('💾 [Mastra] Storage initialized with Postgres')
  }
  return storageInstance
}

export function getMastraInstance() {
  if (!mastraInstance) {
    // Configure serialization limits via environment variables before creating instance
    configureSerializationLimits()

    const langfuseExporter = new LangfuseExporter({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL,
    })

    // Initialize storage for memory persistence across agents
    // See: https://mastra.ai/docs/agents/agent-memory
    const storage = getStorageInstance()

    // Configure workspace with skills
    // See: https://mastra.ai/docs/workspace/skills
    // Get project root (where /skills folder lives)
    // src/domains/storyteller/agents/v2/mastra-instance.ts -> src/domains/storyteller/agents/v2 -> src/domains/storyteller/agents -> src/domains/storyteller -> src -> root
    const currentDir = process.cwd()

    const workspace = new Workspace({
      filesystem: new LocalFilesystem({
        basePath: currentDir, // Root of the project
      }),
      skills: ['/skills'], // Relative to basePath
    })

    mastraInstance = new Mastra({
      agents: {},
      storage, // Enables memory across all configured agents
      workspace, // Register workspace for skills
      logger: new PinoLogger({
        name: 'Mastra',
        level: 'info',
      }),
      observability: new Observability({
        configs: {
          storyteller: {
            serviceName: 'storyteller',
            exporters: [langfuseExporter],
          },
        },
      }),
    })

    console.log('🚀 [Mastra] Centralized instance initialized with memory storage')
  }
  return mastraInstance
}
