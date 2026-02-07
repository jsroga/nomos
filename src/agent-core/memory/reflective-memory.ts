
import { CoPilotInteraction } from '../executive'

// ==========================================
// REFLECTIVE MEMORY
// ==========================================
// Stores and retrieves past decisions for few-shot learning.
// Enables the agent to learn from its own history within a session.

export interface DecisionRecord {
    id: string
    timestamp: Date
    goal: string
    context: string
    thought: string
    decision: CoPilotInteraction
    outcome?: 'success' | 'failure' | 'partial'
    feedback?: string
}

export interface ReflectiveQuery {
    goal?: string
    decisionType?: CoPilotInteraction['type']
    outcome?: DecisionRecord['outcome']
    limit?: number
}

import { AgentMemory } from './agent-memory'

export class ReflectiveMemory {
    private memory: AgentMemory
    private threadId: string = 'reflective-log'

    constructor(memory: AgentMemory) {
        this.memory = memory
    }

    /**
     * Store a decision for future reflection.
     */
    async record(entry: Omit<DecisionRecord, 'id' | 'timestamp'>): Promise<DecisionRecord> {
        const record: DecisionRecord = {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            ...entry
        }

        // Store as a system message in the reflective log thread
        await this.memory.saveMessages({
            messages: [{
                id: record.id,
                threadId: this.threadId,
                role: 'system',
                content: JSON.stringify(record),
                createdAt: record.timestamp
            }],
            format: 'v1' as any
        })

        return record
    }

    /**
     * Update the outcome of a past decision.
     */
    async updateOutcome(id: string, outcome: DecisionRecord['outcome'], feedback?: string): Promise<boolean> {
        // Need to fetch, update, and re-save (upsert)
        // AgentMemory doesn't expose explicit update easily without fetching.
        // Assuming we can just overwrite by ID.
        // But we need the old record to update fields.

        // This is tricky with simple storage.
        // For now, we skip or would need `getMessagesById` exposed on AgentMemory.
        return false
    }

    /**
     * Retrieve similar past decisions for few-shot prompting.
     */
    async query(query: ReflectiveQuery): Promise<DecisionRecord[]> {
        // 1. Vector Search or Fetch All
        let records: DecisionRecord[] = []

        if (query.goal) {
            // Semantic Search
            const result = await this.memory.rememberMessages({
                threadId: this.threadId,
                vectorMessageSearch: query.goal,
                config: { lastMessages: 50 } // fetch candidates
            })

            records = result.messages.map((m: any) => {
                try {
                    return JSON.parse(m.content)
                } catch { return null }
            }).filter(Boolean) as DecisionRecord[]

        } else {
            // Fetch recent
            const result = await this.memory.query({
                threadId: this.threadId,
                selectBy: { last: 100 }
            })
            records = result.messages.map((m: any) => {
                try {
                    return JSON.parse(m.content)
                } catch { return null }
            }).filter(Boolean) as DecisionRecord[]
        }

        // 2. Apply structured filters
        let results = records

        if (query.goal) {
            // Also partial match text if vector didn't catch it or for sanity
            const goalLower = query.goal.toLowerCase()
            // Note: Vector search is fuzzy, so maybe skip strict filter or keep it?
            // Use filter to ensure RELEVANCE if vector search implementation is naive
            // But usually vector search is the filter.
        }

        if (query.decisionType) {
            results = results.filter(r => r.decision.type === query.decisionType)
        }

        if (query.outcome) {
            results = results.filter(r => r.outcome === query.outcome)
        }

        // Deduplicate by ID just in case
        results = Array.from(new Map(results.map(r => [r.id, r])).values())

        // Sort by recency (if not relevance-sorted by vector)
        // Vector search sorts by score. If unrelated to vector, sort by time.
        // If we trust vector score, keep order. 

        return results.slice(0, query.limit || 5)
    }

    /**
     * Generate few-shot examples for prompt injection.
     */
    async generateFewShotExamples(currentGoal: string, limit: number = 3): Promise<string> {
        const similar = await this.query({ goal: currentGoal, outcome: 'success', limit })

        if (similar.length === 0) {
            return 'No similar successful decisions found in memory.'
        }

        return similar.map((r, i) => `
Example ${i + 1}:
Goal: ${r.goal}
Thought: ${r.thought}
Decision: ${JSON.stringify(r.decision, null, 2)}
Outcome: ${r.outcome}
`).join('\n---\n')
    }

    /**
     * Get statistics about decision patterns.
     */
    async getStats(): Promise<{
        total: number
        byType: Record<string, number>
        successRate: number
    }> {
        const result = await this.memory.query({
            threadId: this.threadId,
            selectBy: { last: 1000 }
        })

        const records = result.messages.map((m: any) => {
            try { return JSON.parse(m.content) } catch { return null }
        }).filter(Boolean) as DecisionRecord[]

        const byType: Record<string, number> = {}
        let successes = 0
        let withOutcome = 0

        for (const r of records) {
            byType[r.decision.type] = (byType[r.decision.type] || 0) + 1
            if (r.outcome) {
                withOutcome++
                if (r.outcome === 'success') successes++
            }
        }

        return {
            total: records.length,
            byType,
            successRate: withOutcome > 0 ? successes / withOutcome : 0
        }
    }

    // Export/Import/Clear removed or adapted
    async clear() {
        return this.memory.deleteThread(this.threadId)
    }
}

// ==========================================
// CONFIDENCE CALIBRATION
// ==========================================
// Tracks prediction accuracy to modulate agent autonomy.

export interface ConfidenceRecord {
    id: string
    prediction: string
    confidence: number // 0-1
    wasCorrect?: boolean
}

export class ConfidenceCalibrator {
    private records: ConfidenceRecord[] = []
    private windowSize: number

    constructor(windowSize: number = 50) {
        this.windowSize = windowSize
    }

    /**
     * Record a prediction with confidence.
     */
    predict(prediction: string, confidence: number): string {
        const id = crypto.randomUUID()
        this.records.push({ id, prediction, confidence })

        if (this.records.length > this.windowSize) {
            this.records.shift()
        }

        return id
    }

    /**
     * Mark whether a prediction was correct.
     */
    resolve(id: string, wasCorrect: boolean): void {
        const record = this.records.find(r => r.id === id)
        if (record) {
            record.wasCorrect = wasCorrect
        }
    }

    /**
     * Calculate calibration error (how far predictions are from reality).
     * Lower is better. 0 = perfectly calibrated.
     */
    getCalibrationError(): number {
        const resolved = this.records.filter(r => r.wasCorrect !== undefined)
        if (resolved.length === 0) return 0

        // Expected Calibration Error (ECE)
        // Group by confidence buckets and compare to actual accuracy
        const buckets: Record<number, { correct: number; total: number }> = {}

        for (const r of resolved) {
            const bucket = Math.floor(r.confidence * 10) / 10 // 0.0, 0.1, ..., 0.9
            if (!buckets[bucket]) buckets[bucket] = { correct: 0, total: 0 }
            buckets[bucket].total++
            if (r.wasCorrect) buckets[bucket].correct++
        }

        let ece = 0
        for (const [confidence, data] of Object.entries(buckets)) {
            const actualAccuracy = data.correct / data.total
            const expectedAccuracy = parseFloat(confidence)
            ece += (data.total / resolved.length) * Math.abs(actualAccuracy - expectedAccuracy)
        }

        return ece
    }

    /**
     * Suggest autonomy level based on calibration.
     */
    suggestAutonomyLevel(): 'high' | 'medium' | 'low' {
        const ece = this.getCalibrationError()
        if (ece < 0.1) return 'high'   // Well-calibrated, can trust predictions
        if (ece < 0.25) return 'medium' // Some uncertainty, ask for important decisions
        return 'low' // Poorly calibrated, require frequent human approval
    }
}
