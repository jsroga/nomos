import { Mastra } from '@mastra/core/mastra'
import { LangfuseExporter } from '@mastra/langfuse'
import { LibSQLStore } from '@mastra/libsql'

let mastraInstance: Mastra | null = null
let storageInstance: LibSQLStore | null = null
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
 * Get or create LibSQL storage instance for memory persistence
 * See: https://mastra.ai/docs/agents/agent-memory
 */
export function getStorageInstance(): LibSQLStore {
    if (!storageInstance) {
        // Use file-based storage in development, URL from env in production
        const dbUrl = process.env.MASTRA_LIBSQL_URL || 'file:./mastra-memory.db'
        
        storageInstance = new LibSQLStore({
            id: 'storyteller-storage',
            url: dbUrl,
        })
        
        console.log('💾 [Mastra] Storage initialized:', dbUrl)
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

        mastraInstance = new Mastra({
            agents: {},
            storage, // Enables memory across all configured agents
            observability: {
                configs: {
                    storyteller: {
                        serviceName: 'storyteller',
                        exporters: [langfuseExporter],
                    }
                }
            }
        })

        console.log('🚀 [Mastra] Centralized instance initialized with memory storage')
    }
    return mastraInstance
}
