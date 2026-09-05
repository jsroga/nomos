import { BeatStatus, ManuscriptMode } from '@/domains/storyteller/core/types/enums'
import type { BeatCard } from '@/domains/storyteller/core/types/story-types'

enum CompileJoin {
  Script = '\n\n',
  Novel = '\n\n***\n\n',
}

function isApprovedOrLocked(status: BeatCard['status'] | undefined): boolean {
  return status === BeatStatus.APPROVED || status === BeatStatus.LOCKED
}

export function compileEpisodeManuscript(beats: BeatCard[], mode: ManuscriptMode): string {
  const parts = [...beats]
    .sort((left, right) => left.sequence - right.sequence)
    .filter(beat => {
      const body = beat.content?.trim() ?? ''
      return body.length > 0 && isApprovedOrLocked(beat.status)
    })
    .map(beat => beat.content?.trim() ?? '')
  const join = mode === ManuscriptMode.Novel ? CompileJoin.Novel : CompileJoin.Script
  return parts.join(join)
}
