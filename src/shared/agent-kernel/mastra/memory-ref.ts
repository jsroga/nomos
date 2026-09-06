export enum MemoryThreadPrefix {
  Storyteller = 'storyteller',
  Overlay = 'overlay',
}

/** Empty episode or project slot in the thread key. */
export enum MemorySlot {
  None = '_',
}

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
    thread: `${MemoryThreadPrefix.Storyteller}:${input.projectId}:${input.episodeId ?? MemorySlot.None}:${input.userId}`,
    resource: input.userId,
  }
}

export interface OverlayMemoryRefInput {
  id: string
  userId: string
}

export function overlayMemoryRef(input: OverlayMemoryRefInput): MemoryRef {
  return {
    thread: `${MemoryThreadPrefix.Overlay}:${input.id}`,
    resource: input.userId,
  }
}
