import { MastraMemory, MemoryConfig, StorageThreadType, MastraDBMessage } from '@mastra/core/memory'
import type {
  MemoryStorage,
  StorageCloneThreadInput,
  StorageCloneThreadOutput,
  StorageListMessagesInput,
  StorageListThreadsInput,
  StorageListThreadsOutput,
} from '@mastra/core/storage'
import { InMemoryStore, MastraStorage } from '@mastra/core/storage'
import { MastraVector } from '@mastra/core/vector'
import {
  AgentMemoryLog,
  AgentMemoryMessage,
  AgentMemoryVectorIndex,
  MastraStoreName,
} from '@/shared/agent-kernel/constants/agent-memory'

export class AgentMemory extends MastraMemory {
  constructor(config: { name: string; storage?: MastraStorage; vector?: MastraVector }) {
    super({ name: config.name })
    if (config.storage) this.setStorage(config.storage)
    else this.setStorage(new InMemoryStore())

    if (config.vector) {
      this.setVector(config.vector)
    }
  }

  private async memoryStore(): Promise<MemoryStorage> {
    const memory = await this.storage.getStore(MastraStoreName.Memory)
    if (!memory) {
      throw new Error(AgentMemoryLog.StoreNotConfigured)
    }
    return memory
  }

  async getThreadById(args: { threadId: string }): Promise<StorageThreadType | null> {
    const memory = await this.memoryStore()
    return memory.getThreadById(args)
  }

  async getThreadsByResourceId(args: StorageListThreadsInput): Promise<StorageListThreadsOutput> {
    return this.listThreads(args)
  }

  async getThreadsByResourceIdPaginated(args: StorageListThreadsInput): Promise<StorageListThreadsOutput> {
    return this.listThreads(args)
  }

  async listThreads(args: StorageListThreadsInput): Promise<StorageListThreadsOutput> {
    const memory = await this.memoryStore()
    return memory.listThreads(args)
  }

  async saveThread(args: { thread: StorageThreadType; memoryConfig?: MemoryConfig }): Promise<StorageThreadType> {
    const memory = await this.memoryStore()
    return memory.saveThread({ thread: args.thread })
  }

  async saveMessages(args: { messages: MastraDBMessage[]; memoryConfig?: MemoryConfig }) {
    const memory = await this.memoryStore()
    const saved = await memory.saveMessages({ messages: args.messages })

    if (this.vector && this.embedder) {
      const inputs = saved.messages
        .filter((m): m is MastraDBMessage & { content: string } => typeof m.content === 'string')
        .map(m => ({
          id: m.id,
          text: m.content,
          metadata: { threadId: m.threadId },
        }))

      if (inputs.length > 0) {
        try {
          const { embeddings } = await this.embedder.doEmbed({ values: inputs.map(i => i.text) })

          await this.vector.upsert({
            indexName: AgentMemoryVectorIndex.Messages,
            vectors: embeddings,
            metadata: inputs.map(i => i.metadata),
            ids: inputs.map(i => i.id),
          })
        } catch (err) {
          console.warn(AgentMemoryLog.VectorIndexingFailed, err)
        }
      }
    }

    return saved
  }

  async recall(args: StorageListMessagesInput & { threadConfig?: MemoryConfig; vectorSearchString?: string }) {
    const memory = await this.memoryStore()
    return memory.listMessages(args)
  }

  async updateThread({
    id,
    title,
    metadata,
  }: {
    id: string
    title: string
    metadata: Record<string, unknown>
    memoryConfig?: MemoryConfig
  }) {
    const memory = await this.memoryStore()
    return memory.updateThread({ id, title, metadata })
  }

  async deleteThread(threadId: string) {
    const memory = await this.memoryStore()
    await memory.deleteThread({ threadId })
  }

  async getWorkingMemory(_args: { threadId: string; resourceId?: string; memoryConfig?: MemoryConfig }) {
    return null
  }

  async getWorkingMemoryTemplate(_args: { memoryConfig?: MemoryConfig }) {
    return null
  }

  async updateWorkingMemory(_args: {
    threadId: string
    resourceId?: string
    workingMemory: string
    memoryConfig?: MemoryConfig
  }) {
    // No-op
  }

  async __experimental_updateWorkingMemoryVNext(_args: {
    threadId: string
    resourceId?: string
    workingMemory: string
    searchString?: string
    memoryConfig?: MemoryConfig
  }) {
    return { success: false, reason: AgentMemoryMessage.NotImplemented }
  }

  async deleteMessages(messageIds: string[]) {
    const memory = await this.memoryStore()
    await memory.deleteMessages(messageIds)
  }

  async cloneThread(args: StorageCloneThreadInput): Promise<StorageCloneThreadOutput> {
    const memory = await this.memoryStore()
    return memory.cloneThread(args)
  }

  async rememberMessages({
    threadId,
    resourceId,
    vectorMessageSearch,
    config,
  }: {
    threadId: string
    resourceId?: string
    vectorMessageSearch?: string
    config?: { lastMessages?: number }
  }) {
    const memory = await this.memoryStore()
    const result = await memory.listMessages({
      threadId,
      resourceId,
      perPage: config?.lastMessages || 10,
    })
    const messages: MastraDBMessage[] = result.messages

    if (this.vector && this.embedder && vectorMessageSearch) {
      try {
        const { embeddings } = await this.embedder.doEmbed({ values: [vectorMessageSearch] })
        const queryVector = embeddings[0]

        const results = await this.vector.query({
          indexName: AgentMemoryVectorIndex.Messages,
          queryVector: queryVector,
          topK: 5,
        })

        const resultIds = results.map(r => r.id).filter((id): id is string => !!id)
        if (resultIds.length > 0) {
          const vectorResult = await memory.listMessagesById({ messageIds: resultIds })
          vectorResult.messages.forEach(m => messages.push(m))
        }
      } catch (err) {
        console.warn(AgentMemoryLog.VectorSearchFailed, err)
      }
    }

    const uniqueMessages = Array.from(new Map(messages.map(m => [m.id, m])).values())

    return {
      messages: uniqueMessages,
    }
  }
}
