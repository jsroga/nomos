import type { StoryPlan, WorldRule, Faction, KeyCharacter, StorySequence, Item, StoryEvent } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import type { StreamAgentAction } from '@/domains/storyteller/core/types/action-types'

export interface PendingAction {
  section: string
  preview: unknown
  action: StreamAgentAction
  onAccept: () => void
  onReject: () => void
  onReview?: () => void
  isProcessing?: boolean
  episodeId?: string | null
}

export type BibleProviderConfig = Record<string, unknown>

export interface BibleContextType {
  storyPlan: StoryPlan
  localPlan: Partial<StoryPlan>
  isEditing: boolean
  isReadOnly: boolean
  isLocked: boolean
  lockedBy: string | null
  lockedAt: Date | null
  userEmail: string | null
  isLockLoading: boolean
  projectId: string
  onSendMessage?: (msg: string, section?: string) => void
  getProviderConfig: () => BibleProviderConfig
  loadingSections: Record<string, { loading: boolean; message?: string }>
  pendingActions: Record<string, PendingAction>
  setPendingAction: (section: string, action: PendingAction | null) => void
  setIsEditing: (val: boolean) => void
  updateLocalPlan: (updates: Partial<StoryPlan>) => void
  savePlan: () => Promise<void>
  cancelEdit: () => void
  toggleLock: () => Promise<void>
  updateWorldRule: <K extends keyof WorldRule>(index: number, field: K, value: WorldRule[K]) => void
  addWorldRule: () => void
  removeWorldRule: (index: number) => void
  updateFaction: <K extends keyof Faction>(index: number, field: K, value: Faction[K]) => void
  addFaction: () => void
  removeFaction: (index: number) => void
  updateKeyCharacter: <K extends keyof KeyCharacter>(
    index: number,
    field: K,
    value: KeyCharacter[K]
  ) => void
  addKeyCharacter: () => void
  removeKeyCharacter: (index: number) => void
  updateSequence: <K extends keyof StorySequence>(
    index: number,
    field: K,
    value: StorySequence[K]
  ) => void
  addSequence: () => void
  removeSequence: (index: number) => void
  updatePlotTwist: (index: number, value: string) => void
  addPlotTwist: () => void
  removePlotTwist: (index: number) => void
  updateInspiration: (category: 'books' | 'movies' | 'games', value: string) => void
  updateItem: <K extends keyof Item>(index: number, field: K, value: Item[K]) => void
  addItem: () => void
  removeItem: (index: number) => void
  updateEvent: <K extends keyof StoryEvent>(index: number, field: K, value: StoryEvent[K]) => void
  addEvent: () => void
  removeEvent: (index: number) => void
}
