export interface MemoryRefInput {
  projectId: string
  episodeId?: string
  userId: string
}

export interface MemoryRef {
  thread: string
  resource: string
}

export function memoryRef(input: MemoryRefInput): MemoryRef {
  return {
    thread: `storyteller:${input.projectId}:${input.episodeId ?? '_'}:${input.userId}`,
    resource: input.userId,
  }
}
