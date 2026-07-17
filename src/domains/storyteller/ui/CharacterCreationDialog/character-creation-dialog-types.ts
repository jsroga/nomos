import { CharacterDialogMode } from './constants/character-creation-dialog'

export interface InitialCharacterData {
  id?: string
  name?: string
  description?: string
  role?: string
  gender?: string
  mbti?: string
  portraitUrl?: string
  voiceSignature?: string
  archetype?: string
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

export const INITIAL_METRICS = {
  valence: 0,
  arousal: 50,
  autonomy: 60,
  competence: 60,
  relatedness: 50,
  cognitiveClarity: 70,
  perceivedStakes: 40,
  socialSafety: 60,
  moralAlignment: 70,
}

export type CharacterMetrics = typeof INITIAL_METRICS

export interface PortraitGenState {
  isGenerating: boolean
  gridImageUrl: string | null
  needsVariantPick: boolean
  portraitUrlOverride: string | null
}

export const EMPTY_PORTRAIT_GEN_STATE: PortraitGenState = {
  isGenerating: false,
  gridImageUrl: null,
  needsVariantPick: false,
  portraitUrlOverride: null,
}
