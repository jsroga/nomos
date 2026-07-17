import type { PhaseId } from '@/domains/storyteller/core/types/enums'
import type { StorytellerCharacter } from '@/domains/storyteller/core/entities/character-wire'
import {
  Phase as StorytellerPhase,
  StorytellerTab,
} from '@/domains/storyteller/state/constants/storyteller-chat'
import {
  readNumber,
  readString,
  stringArrayFromJson,
} from '@/shared/data/json-guards'

export function resolveEffectivePhase(
  currentPhase: PhaseId,
  isWorldBibleOpen: boolean,
  activeTab: string
): PhaseId {
  if (isWorldBibleOpen) return StorytellerPhase.PREMISE
  if (activeTab === StorytellerTab.Script) return StorytellerPhase.WRITING
  if (activeTab === StorytellerTab.Board) return StorytellerPhase.BREAKING
  if (activeTab === StorytellerTab.Plan) return StorytellerPhase.PREMISE
  return currentPhase
}

export function buildCharactersSummary(characters: StorytellerCharacter[]) {
  return characters.map(c => ({
    characterId: c.id,
    name: c.name,
    currentGoals: stringArrayFromJson(c.psychology?.goals),
    fears: stringArrayFromJson(c.psychology?.fears),
    selfDelusion: readString(c.psychology?.selfDelusion) ?? '',
    actualMotivation: readString(c.psychology?.actualMotivation) ?? '',
    transformationProgress: c.transformation || 0,
    knowledgeState: stringArrayFromJson(c.psychology?.knowledgeState),
    stressLevel: readNumber(c.psychology?.stress) ?? 30,
  }))
}
