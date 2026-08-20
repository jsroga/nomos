import { CharacterDialogMode } from './constants/character-creation-dialog'
import {
  DEFAULT_CHARACTER_METRICS,
  type CharacterMetricDefaults,
} from '@/domains/storyteller/core/character-missing-fields'

export interface InitialCharacterData {
  id?: string
  name?: string
  description?: string
  role?: string
  gender?: string
  mbti?: string
  portraitUrl?: string
  motivation?: string
  fatalFlaw?: string
  secrets?: string
  psychology?: Record<string, unknown>
  valence?: number
  arousal?: number
  autonomy?: number
  competence?: number
  relatedness?: number
  cognitiveClarity?: number
  perceivedStakes?: number
  socialSafety?: number
  moralAlignment?: number
}

export interface CharacterCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (character: Record<string, unknown>) => void | Promise<void>
  onUpdate?: (characterId: string, updates: Record<string, unknown>) => void | Promise<void>
  projectId?: string
  initialData?: InitialCharacterData
  mode?: CharacterDialogMode
}

export const INITIAL_METRICS = DEFAULT_CHARACTER_METRICS
export type CharacterMetrics = CharacterMetricDefaults

export interface PortraitGenState {
  isGenerating: boolean
  gridImageUrl: string | null
  needsVariantPick: boolean
  portraitUrlOverride: string | null
  completedPortraitUrl: string | null
}

export const EMPTY_PORTRAIT_GEN_STATE: PortraitGenState = {
  isGenerating: false,
  gridImageUrl: null,
  needsVariantPick: false,
  portraitUrlOverride: null,
  completedPortraitUrl: null,
}
