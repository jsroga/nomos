
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { AgentMemory } from '../../src/agent-core/memory/agent-memory'
import { PgVector } from '@mastra/pg'
import { InMemoryStore } from '@mastra/core/storage'

const DATABASE_URL = process.env.DATABASE_URL

describe.skipIf(!DATABASE_URL)('AgentMemory Integration with PgVector', () => {
    let vector: PgVector

    beforeAll(async () => {
        vector = new PgVector({
            id: 'test-messages',
            connectionString: DATABASE_URL!,
        })
        await vector.createIndex({ indexName: 'test_messages', dimension: 3, metric: 'cosine' })
    })

    afterAll(async () => {
        try {
            await vector.deleteIndex({ indexName: 'test_messages' })
        } catch {
            // Index might not exist
        }
        if (vector) {
            await vector.disconnect()
        }
    })

    it('should save and recall messages using vector search', async () => {
        // Mock Embedder
        const mockEmbedder = {
            doEmbed: async ({ values }: { values: string[] }) => {
                // Return random vectors of dim 3
                return {
                    embeddings: values.map(() => [0.1, 0.2, 0.3]) // Fixed vector for consistent testing
                }
            }
        } as any

        const memory = new AgentMemory({
            name: 'test-agent',
            storage: new InMemoryStore(),
            vector: vector
        })

        memory.setEmbedder(mockEmbedder)

        // Save Messages
        const threadId = 'thread-1'
        const messages = [
            {
                id: 'msg-1',
                threadId,
                role: 'user',
                content: JSON.stringify('Hello, I want to write a story about a brave knight.'),
                createdAt: new Date()
            },
            {
                id: 'msg-2',
                threadId,
                role: 'assistant',
                content: JSON.stringify('That sounds exciting! What represents the knight?'),
                createdAt: new Date()
            }
        ]

        await memory.saveMessages({ messages: messages as any })

        // Query (Standard)
        const recent = await memory.query({ threadId })
        expect(recent.messages.length).toBe(2)

        // Remember (Vector Search)
        const recall = await memory.rememberMessages({
            threadId,
            vectorMessageSearch: 'knight context',
            config: { lastMessages: 1 }
        })

        expect(recall).toBeDefined()
        expect(recall.messages.length).toBeGreaterThan(0)

        const content = JSON.stringify(recall.messages)
        expect(content).toContain('knight')
    })
})
