/** Storyteller UI store — cross-panel navigation and generation signals (replaces window CustomEvents). */


export interface EntityNavigationPayload {
  refId: string
  entityName?: string
  entityType?: string
}

export interface MoodboardCompletePayload {
  projectId: string
  promptIndex?: number
  images: string[]
}

/** Bible section refresh → Writers Room chat inject. */
export interface PendingChatPromptPayload {
  message: string
  section?: string
  /** Monotonic id so the same text can be re-sent. */
  id: number
}

/** Live Writers Room / bible-section generation progress for overlays. */
export enum GenerationActivityPhase {
  Idle = 'idle',
  Submitted = 'submitted',
  Streaming = 'streaming',
  Tool = 'tool',
  Error = 'error',
}

/** Writers Room is a single conversation — parallel section refreshes crash the thread. */
export function isGenerationActivityBusy(phase: GenerationActivityPhase): boolean {
  return (
    phase === GenerationActivityPhase.Submitted ||
    phase === GenerationActivityPhase.Streaming ||
    phase === GenerationActivityPhase.Tool
  )
}

export interface GenerationActivityState {
  phase: GenerationActivityPhase
  label: string
  section?: string
  toolName?: string
  agentId?: string
  /** Streaming tool-input preview (e.g. worldDescription draft). */
  preview?: string
  error?: string
  updatedAt: number
}

export enum StorytellerUiSignal {
  EntityNavigation = 'entityNavigation',
  BibleTabRequest = 'bibleTabRequest',
  MoodboardComplete = 'moodboardComplete',
  MoodboardPrimaryChanged = 'moodboardPrimaryChanged',
  PendingChatPrompt = 'pendingChatPrompt',
  GenerationActivity = 'generationActivity',
}
