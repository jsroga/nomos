export enum MastraStoreName {
  Memory = 'memory',
}

export enum MastraUiMessagePartType {
  Text = 'text',
}

export enum AgentMemoryVectorIndex {
  Messages = 'messages',
}

export enum AgentMemoryLog {
  StoreNotConfigured = '[AgentMemory] Memory store not configured on MastraCompositeStore',
  VectorIndexingFailed = '[AgentMemory] Vector indexing failed:',
  VectorSearchFailed = '[AgentMemory] Vector search failed:',
}

export enum AgentMemoryMessage {
  NotImplemented = 'Not implemented',
}
