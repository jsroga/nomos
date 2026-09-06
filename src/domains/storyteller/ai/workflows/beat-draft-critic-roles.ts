import '@/shared/data/server-guard'
import { FeatureFlag, isFeatureEnabled } from '@/shared/data/constants/feature-flags'
import type { BeatDraftCanon } from '@/domains/storyteller/core/types/beat-draft-canon'
import { CanonAudience, formatCanonFor } from './beat-draft-canon'
import {
  BEAT_DRAFT_CRITIC_ROLES,
  BeatDraftCriticName,
} from './constants/beat-draft-workflow'

export const BEAT_DRAFT_EXTRA_CRITIC_ROLES = [BeatDraftCriticName.Dialogue] as const

export function extraCriticScopesEnabled(): boolean {
  return isFeatureEnabled(FeatureFlag.StorytellerExtraCriticScopes)
}

export function activeBeatDraftCriticRoles(): readonly BeatDraftCriticName[] {
  if (!extraCriticScopesEnabled()) return BEAT_DRAFT_CRITIC_ROLES
  return [...BEAT_DRAFT_CRITIC_ROLES, ...BEAT_DRAFT_EXTRA_CRITIC_ROLES]
}

export function canonTextForCriticRole(
  role: BeatDraftCriticName,
  canon: BeatDraftCanon,
  characters: string[]
): string {
  if (role === BeatDraftCriticName.Continuity) {
    return formatCanonFor(CanonAudience.Continuity, canon, characters)
  }
  if (role === BeatDraftCriticName.Stakes) {
    return formatCanonFor(CanonAudience.Stakes, canon, characters)
  }
  return formatCanonFor(CanonAudience.Author, canon, characters)
}
