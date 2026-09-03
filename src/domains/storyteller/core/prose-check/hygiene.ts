import {
  FindingSeverity,
  ProblemType,
  type Finding,
} from '@/domains/storyteller/core/types/finding'
import { DraftBeatId } from '@/domains/storyteller/core/types/beat-draft-canon'
import { CHAPTER_MARK_PATTERN, HygieneFindingCopy } from './constants'

export function checkChapterHygiene(draft: string): Finding[] {
  const findings: Finding[] = []
  const lines = draft.split('\n')
  for (let paragraph = 0; paragraph < lines.length; paragraph += 1) {
    const line = lines[paragraph]
    const match = CHAPTER_MARK_PATTERN.exec(line)
    if (!match) continue
    findings.push({
      location: { beatId: DraftBeatId.Draft, paragraph, quote: match[0] },
      problemType: ProblemType.SceneStructure,
      whatHappensNow: HygieneFindingCopy.ChapterWhat,
      whyItFails: HygieneFindingCopy.ChapterWhy,
      revisionDirection: HygieneFindingCopy.ChapterDirection,
      severity: FindingSeverity.Error,
      promoteToProjectRule: false,
    })
  }
  return findings
}
