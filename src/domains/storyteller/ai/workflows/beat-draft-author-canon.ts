import '@/shared/data/server-guard'
import type { BeatDraftCanon } from '@/domains/storyteller/core/types/beat-draft-canon'
import { CanonAudience, formatCanonFor } from './beat-draft-canon'
import {
  BEAT_DRAFT_AUTHOR_CANON_CHAR_BUDGET,
  BEAT_DRAFT_AUTHOR_CANON_TRUNCATED,
} from './constants/beat-draft-workflow'

function truncateAuthorCanon(text: string): string {
  if (text.length <= BEAT_DRAFT_AUTHOR_CANON_CHAR_BUDGET) return text
  return `${text.slice(0, BEAT_DRAFT_AUTHOR_CANON_CHAR_BUDGET)}${BEAT_DRAFT_AUTHOR_CANON_TRUNCATED}`
}

export function authorCanonText(canon: BeatDraftCanon, characters: string[]): string {
  return truncateAuthorCanon(formatCanonFor(CanonAudience.Author, canon, characters))
}
