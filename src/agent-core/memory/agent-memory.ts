
import { MastraMemory } from '@mastra/core/memory'
import { InMemoryStore, MastraStorage } from '@mastra/core/storage'
import { MastraVector } from '@mastra/core/vector'
// Types available if needed: MemoryConfig, MastraMessageV1, MastraMessageV2

export class AgentMemory extends MastraMemory {
    constructor(config: { name: string, storage?: MastraStorage, vector?: MastraVector }) {
        super({ name: config.name })
        if (config.storage) this.setStorage(config.storage)
        else this.setStorage(new InMemoryStore())

        if (config.vector) {
            this.setVector(config.vector)
        }
    }

    async getThreadById(args: any) {
        return this.storage.getThreadById(args)
    }

    async getThreadsByResourceId(args: any) {
        return this.storage.getThreadsByResourceId(args)
    }

    async getThreadsByResourceIdPaginated(args: any) {
        return this.storage.getThreadsByResourceIdPaginated(args)
    }

    async saveThread(args: any) {
        return this.storage.saveThread(args)
    }

    async saveMessages(args: any) {
        const saved = await this.storage.saveMessages(args)

        // RAG: Index new messages if vector store/embedder are available.
        // Logic: Text content -> Embed -> Upsert
        if (this.vector && this.embedder) {
            const messagesToEmbed = Array.isArray(saved) ? saved : [saved]
            // We assume simple text messages for now
            const inputs = messagesToEmbed
                .filter((m: any) => typeof m.content === 'string')
                .map((m: any) => ({ id: m.id, text: m.content as string, metadata: { threadId: m.threadId } }))

            if (inputs.length > 0) {
                try {
                    const { embeddings } = await this.embedder.doEmbed({ values: inputs.map(i => i.text) })

                    await this.vector.upsert({
                        indexName: 'messages',
                        vectors: embeddings,
                        metadata: inputs.map(i => i.metadata),
                        ids: inputs.map(i => i.id)
                    })
                } catch (err) {
                    console.warn('[AgentMemory] Vector indexing failed:', err)
                }
            }
        }

        return saved as any
    }

    async query(args: any) {
        // MastraStorage has getMessages, not query.
        // We need to return { messages, uiMessages, messagesV2 }
        const messages = await this.storage.getMessages(args)
        return {
            messages: messages as any[],
            uiMessages: [],
            messagesV2: []
        }
    }

    async deleteThread(threadId: string) {
        return this.storage.deleteThread({ threadId })
    }

    async getWorkingMemory(args: any) {
        // Mock implementation or delegate if storage supports it
        // InMemoryStore doesn't explicitly expose getWorkingMemory in definition but let's check base
        // If not, return null
        return null
    }

    async getWorkingMemoryTemplate(args: any) {
        return null
    }

    async updateWorkingMemory(args: any) {
        // No-op
    }

    async __experimental_updateWorkingMemoryVNext(args: any) {
        return { success: false, reason: 'Not implemented' }
    }

    async deleteMessages(messageIds: string[]) {
        return this.storage.deleteMessages(messageIds)
    }

    async rememberMessages({ threadId, resourceId, vectorMessageSearch, config }: any) {
        // 1. Get recent messages
        // Use getMessages from storage
        const messages = await this.storage.getMessages({
            threadId,
            resourceId,
            selectBy: { last: config?.lastMessages || 10 }
        } as any)

        const messagesV2: any[] = [] // Fill if needed

        // 2. Vector Search (Hybrid RAG)
        if (this.vector && this.embedder && vectorMessageSearch) {
            try {
                const { embeddings } = await this.embedder.doEmbed({ values: [vectorMessageSearch] })
                const queryVector = embeddings[0]

                const results = await this.vector.query({
                    indexName: 'messages',
                    queryVector: queryVector,
                    topK: 5
                })

                // Fetch full messages for results
                const resultIds = results.map((r: any) => r.id)
                if (resultIds.length > 0) {
                    // We use getMessagesById from storage if available, assuming we can cast storage to access it
                    // MastraStorage interface usually has getMessagesById (mock.d.ts showed it)
                    // But naming might vary. mock.d.ts: getMessagesById({ messageIds, format })

                    if ('getMessagesById' in this.storage) {
                        const vectorMessages = await (this.storage as any).getMessagesById({
                            messageIds: resultIds,
                            format: 'v1'
                        })
                        // Merge loop (simplistic)
                        vectorMessages.forEach((m: any) => messages.push(m))
                    }
                }
            } catch (err) {
                console.warn('[AgentMemory] Vector search failed:', err)
            }
        }

        // Deduplicate
        const uniqueMessages = Array.from(new Map(messages.map((m: any) => [m.id, m])).values())

        return {
            messages: uniqueMessages as any[],
            messagesV2
        }
    }
}
