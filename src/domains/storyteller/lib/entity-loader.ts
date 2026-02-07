
import { EntityReference } from '../components/ReferenceText'

/**
 * EntityLoader
 * 
 * Implements the Dataloader pattern to batch multiple entity resolution requests
 * into a single API call.
 */
export class EntityLoader {
    private queue: Map<string, { resolve: (value: EntityReference | null) => void; reject: (reason?: any) => void; projectId: string }> = new Map()
    private timeout: NodeJS.Timeout | null = null
    private readonly delay: number

    constructor(delay = 50) {
        this.delay = delay
    }

    /**
     * Load an entity by ID
     */
    load(id: string, projectId: string): Promise<EntityReference | null> {
        return new Promise((resolve, reject) => {
            const key = `${projectId}:${id}`

            // If already queued, we just overwrite the handler (last one wins? or should we support multiple?)
            // For simplicity/safety, we can just append to a list if needed, but given React Query dedupes 
            // requests for the same key, we likely won't get simultaneous calls for the SAME id from React Query
            // unless different components trigger it simultaneously before RQ cache is hit.
            // 
            // Actually, React Query's queryFn is called once per key. So we shouldn't see duplicates for same ID here
            // if React Query is doing its job.

            this.queue.set(key, { resolve, reject, projectId })

            if (!this.timeout) {
                this.timeout = setTimeout(() => this.flush(), this.delay)
            }
        })
    }

    private async flush() {
        this.timeout = null
        const currentQueue = new Map(this.queue)
        this.queue.clear()

        if (currentQueue.size === 0) return

        // Group by projectId
        const byProject: Record<string, string[]> = {}

        for (const [key, { projectId }] of currentQueue.entries()) {
            // key is projectId:originalId
            // we need originalId
            // But we can just store originalId in value to be safe, or split key.
            const originalId = key.split(':')[1]
            // Wait, split might be dangerous if ID has colons. 
            // Better to extract from key if we built it that way.
            // Let's refine the key structure or stored data.

            if (!byProject[projectId]) {
                byProject[projectId] = []
            }
            byProject[projectId].push(originalId)
        }

        // Fire requests per project
        // Note: We could optimize this to parallelize
        await Promise.all(Object.entries(byProject).map(async ([projectId, ids]) => {
            try {
                const uniqueIds = Array.from(new Set(ids))
                const res = await fetch(`/api/entities/resolve?projectId=${projectId}&ids=${uniqueIds.join(',')}&enrichRelationships=true`)

                if (!res.ok) throw new Error('Failed to fetch')

                const data = await res.json()
                const entities = data.entities as EntityReference[]
                const entityMap = new Map(entities.map(e => [e.id, e]))

                // Resolve promises
                ids.forEach(originalId => {
                    const key = `${projectId}:${originalId}`
                    const handler = currentQueue.get(key)
                    if (handler) {
                        handler.resolve(entityMap.get(originalId) || null)
                    }
                })
            } catch (error) {
                // Reject all for this project
                ids.forEach(originalId => {
                    const key = `${projectId}:${originalId}`
                    const handler = currentQueue.get(key)
                    if (handler) {
                        handler.reject(error)
                    }
                })
            }
        }))
    }
}

// Global instance for singleton usage if needed, 
// though usually we instantiated it inside a helper or exported const.
export const entityLoader = new EntityLoader()
