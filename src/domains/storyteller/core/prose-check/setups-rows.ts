import {
  FindingSeverity,
  ProblemType,
  type Finding,
} from '@/domains/storyteller/core/types/finding'
import { DraftBeatId } from '@/domains/storyteller/core/types/beat-draft-canon'
import { SetupFindingCopy } from './constants'

export interface SetupTableRow {
  setupBeatId: string | null
  payoffBeatId: string | null
  description: string
  isResolved: boolean | null
}

export function setupsFindingsFromRows(
  rows: readonly SetupTableRow[],
  episodeBeatIds: ReadonlySet<string>
): Finding[] {
  const findings: Finding[] = []

  for (const row of rows) {
    const inEpisodeSetup = row.setupBeatId !== null && episodeBeatIds.has(row.setupBeatId)
    if (inEpisodeSetup && row.payoffBeatId === null) {
      findings.push({
        location: { beatId: row.setupBeatId ?? DraftBeatId.Draft, paragraph: 0, quote: row.description },
        problemType: ProblemType.SceneStructure,
        whatHappensNow: SetupFindingCopy.MissingPayoffWhat,
        whyItFails: `Setup "${row.description}" is unresolved.`,
        revisionDirection: SetupFindingCopy.MissingPayoffDirection,
        severity: FindingSeverity.Warning,
        promoteToProjectRule: false,
      })
    }

    const inEpisodePayoff = row.payoffBeatId !== null && episodeBeatIds.has(row.payoffBeatId)
    if (inEpisodePayoff && row.setupBeatId === null) {
      findings.push({
        location: { beatId: row.payoffBeatId ?? DraftBeatId.Draft, paragraph: 0, quote: row.description },
        problemType: ProblemType.SceneStructure,
        whatHappensNow: SetupFindingCopy.OrphanedSetupWhat,
        whyItFails: `Orphaned setup "${row.description}".`,
        revisionDirection: SetupFindingCopy.OrphanedSetupDirection,
        severity: FindingSeverity.Error,
        promoteToProjectRule: false,
      })
    }
  }

  return findings
}
