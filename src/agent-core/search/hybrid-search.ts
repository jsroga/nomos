/**
 * Hybrid Search - BM25 + Vector Search for Content Discovery
 *
 * Mastra-style search that combines:
 * - BM25 for keyword matching
 * - Vector embeddings for semantic similarity
 * - Reciprocal Rank Fusion (RRF) for result merging
 */

import { getStorytellerWorkspace, ScriptArtifact } from '../workspace'

export interface SearchResult {
    id: string
    type: string
    name: string
    content: string
    score: number
    source: 'bm25' | 'vector' | 'hybrid'
    highlights?: string[]
}

export interface SearchOptions {
    mode: 'bm25' | 'vector' | 'hybrid'
    limit?: number
    threshold?: number
    projectId?: string
    types?: string[]
}

/**
 * Simple BM25 implementation for keyword search
 */
class BM25Index {
    private documents: Map<string, string[]> = new Map()
    private docLengths: Map<string, number> = new Map()
    private avgDocLength: number = 0
    private idf: Map<string, number> = new Map()
    private k1: number = 1.5
    private b: number = 0.75

    addDocument(id: string, text: string): void {
        const tokens = this.tokenize(text)
        this.documents.set(id, tokens)
        this.docLengths.set(id, tokens.length)
        this.updateAvgLength()
    }

    private tokenize(text: string): string[] {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 2)
    }

    private updateAvgLength(): void {
        const lengths = Array.from(this.docLengths.values())
        this.avgDocLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
    }

    computeIDF(): void {
        const N = this.documents.size
        const docFreq = new Map<string, number>()

        for (const tokens of this.documents.values()) {
            const seen = new Set<string>()
            for (const token of tokens) {
                if (!seen.has(token)) {
                    docFreq.set(token, (docFreq.get(token) || 0) + 1)
                    seen.add(token)
                }
            }
        }

        for (const [term, df] of docFreq) {
            this.idf.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1))
        }
    }

    search(query: string, limit: number = 10): Array<{ id: string; score: number }> {
        const queryTokens = this.tokenize(query)
        const scores = new Map<string, number>()

        for (const [docId, docTokens] of this.documents) {
            const docLength = this.docLengths.get(docId) || 0
            let score = 0

            for (const queryToken of queryTokens) {
                const tf = docTokens.filter(t => t === queryToken).length
                const idf = this.idf.get(queryToken) || 0

                const numerator = tf * (this.k1 + 1)
                const denominator = tf + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength))

                score += idf * (numerator / denominator)
            }

            if (score > 0) {
                scores.set(docId, score)
            }
        }

        return Array.from(scores.entries())
            .map(([id, score]) => ({ id, score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
    }

    clear(): void {
        this.documents.clear()
        this.docLengths.clear()
        this.idf.clear()
        this.avgDocLength = 0
    }
}

/**
 * Hybrid Search Engine
 */
export class HybridSearchEngine {
    private bm25Index: BM25Index = new BM25Index()
    private documentStore: Map<string, ScriptArtifact> = new Map()
    private initialized: boolean = false

    /**
     * Initialize the search engine with existing documents
     */
    async initialize(): Promise<void> {
        const workspace = getStorytellerWorkspace()

        try {
            await workspace.initialize()
        } catch {
            // Workspace may already be initialized
        }

        // Load all scripts into the index
        const allScripts = await this.loadAllScripts(workspace)

        for (const script of allScripts) {
            this.indexDocument(script)
        }

        this.bm25Index.computeIDF()
        this.initialized = true
    }

    private async loadAllScripts(workspace: any): Promise<ScriptArtifact[]> {
        // This is a simplified version - in production, you'd iterate through all projects
        try {
            const stats = await workspace.getStats()
            if (stats.totalScripts === 0) {
                return []
            }
            // For now, return empty - full implementation would need project IDs
            return []
        } catch {
            return []
        }
    }

    /**
     * Index a document for search
     */
    indexDocument(artifact: ScriptArtifact): void {
        const searchableContent = [
            artifact.name,
            artifact.content,
            artifact.type,
        ].join(' ')

        this.bm25Index.addDocument(artifact.id, searchableContent)
        this.documentStore.set(artifact.id, artifact)
    }

    /**
     * Remove a document from the index
     */
    removeDocument(id: string): void {
        this.documentStore.delete(id)
        // Note: BM25 index doesn't support removal, would need rebuild
    }

    /**
     * Perform a search
     */
    async search(query: string, options: SearchOptions = { mode: 'hybrid' }): Promise<SearchResult[]> {
        const limit = options.limit || 10
        const results: SearchResult[] = []

        if (options.mode === 'bm25' || options.mode === 'hybrid') {
            const bm25Results = this.bm25Index.search(query, limit)

            for (const { id, score } of bm25Results) {
                const doc = this.documentStore.get(id)
                if (doc) {
                    // Apply filters
                    if (options.projectId && doc.metadata.projectId !== options.projectId) continue
                    if (options.types && !options.types.includes(doc.type)) continue

                    results.push({
                        id: doc.id,
                        type: doc.type,
                        name: doc.name,
                        content: doc.content.slice(0, 500),
                        score,
                        source: 'bm25',
                        highlights: this.extractHighlights(doc.content, query)
                    })
                }
            }
        }

        // Vector search would go here - requires embedding model
        if (options.mode === 'vector' || options.mode === 'hybrid') {
            // Placeholder for vector search implementation
            // This would use the voyage embeddings from the existing infrastructure
        }

        // If hybrid, apply RRF
        if (options.mode === 'hybrid' && results.length > 0) {
            return this.applyRRF(results, limit)
        }

        return results.slice(0, limit)
    }

    /**
     * Reciprocal Rank Fusion for combining results
     */
    private applyRRF(results: SearchResult[], limit: number, k: number = 60): SearchResult[] {
        const rrfScores = new Map<string, number>()
        const resultMap = new Map<string, SearchResult>()

        // Group by source and compute RRF scores
        const bySource = new Map<string, SearchResult[]>()
        for (const result of results) {
            const source = result.source
            if (!bySource.has(source)) {
                bySource.set(source, [])
            }
            bySource.get(source)!.push(result)
            resultMap.set(result.id, result)
        }

        for (const [_source, sourceResults] of bySource) {
            sourceResults.forEach((result, rank) => {
                const rrfScore = 1 / (k + rank + 1)
                rrfScores.set(result.id, (rrfScores.get(result.id) || 0) + rrfScore)
            })
        }

        // Sort by RRF score and return
        return Array.from(rrfScores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([id, score]) => ({
                ...resultMap.get(id)!,
                score,
                source: 'hybrid' as const
            }))
    }

    /**
     * Extract highlighted snippets from content
     */
    private extractHighlights(content: string, query: string): string[] {
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
        const sentences = content.split(/[.!?]+/)
        const highlights: string[] = []

        for (const sentence of sentences) {
            const sentenceLower = sentence.toLowerCase()
            if (queryWords.some(word => sentenceLower.includes(word))) {
                highlights.push(sentence.trim().slice(0, 150))
                if (highlights.length >= 3) break
            }
        }

        return highlights
    }

    /**
     * Rebuild the entire index
     */
    async rebuildIndex(): Promise<void> {
        this.bm25Index.clear()
        this.documentStore.clear()
        await this.initialize()
    }

    /**
     * Get index stats
     */
    getStats(): { documentCount: number; initialized: boolean } {
        return {
            documentCount: this.documentStore.size,
            initialized: this.initialized
        }
    }
}

// Singleton instance
let searchEngineInstance: HybridSearchEngine | null = null

export function getSearchEngine(): HybridSearchEngine {
    if (!searchEngineInstance) {
        searchEngineInstance = new HybridSearchEngine()
    }
    return searchEngineInstance
}

export async function initializeSearch(): Promise<HybridSearchEngine> {
    const engine = getSearchEngine()
    await engine.initialize()
    return engine
}
