
/**
 * Vector Memory Adapter for Agent-Core
 * 
 * NOTE: This is a MOCK implementation for evaluation scripts.
 * The real HybridSearchEngine requires DB access which is not available
 * in standalone tsx scripts.
 * 
 * For production use within Next.js, import from:
 * '@/infrastructure/ai/rag/hybrid-search'
 */

export interface MemorySearchResult {
    id: string
    content: string
    metadata: Record<string, any>
    score: number
}

/**
 * MockVectorMemory for evaluation scripts (no DB dependency).
 * Returns empty results to prevent runtime errors.
 */
export class VectorMemoryAdapter {
    private projectId: string

    constructor(projectId: string) {
        this.projectId = projectId
        console.warn('[VectorMemoryAdapter] Running in MOCK mode (no DB).')
    }

    async search(query: string, limit: number = 3): Promise<MemorySearchResult[]> {
        // Mock: return empty array
        return []
    }

    async searchByType(documentType: string, query: string, limit: number = 3): Promise<MemorySearchResult[]> {
        // Mock: return empty array
        return []
    }

    formatForPrompt(results: MemorySearchResult[]): string {
        if (results.length === 0) {
            return 'No relevant memories found (Mock Mode).'
        }

        return results.map((r, i) => `
[Memory ${i + 1}] (Score: ${(r.score * 100).toFixed(0)}%)
Type: ${r.metadata?.documentType || 'unknown'}
Content: ${r.content.substring(0, 300)}...
`).join('\n---\n')
    }
}

// Factory function for convenience
export function createVectorMemory(projectId: string): VectorMemoryAdapter {
    return new VectorMemoryAdapter(projectId)
}

// Export namespace for production import
export const ProductionMemory = {
    // To use real memory, import these from @/infrastructure/ai/rag/hybrid-search
    // HybridSearchEngine, getHybridSearchEngine
}
