import '@/shared/data/server-guard'
import {
  ContinuityAffectedKind,
  ContinuityFindingSeverity,
  type ConsistencyFixItem,
  type ContinuityFinding,
} from './fix-inconsistencies-schema'
import { FixInconsistenciesSkipReason } from './constants/fix-inconsistencies-workflow'
import type { AssembledCanon, SkippedFinding } from './fix-inconsistencies-contract'

const SEVERITY_RANK: Record<ContinuityFindingSeverity, number> = {
  [ContinuityFindingSeverity.Critical]: 0,
  [ContinuityFindingSeverity.Major]: 1,
  [ContinuityFindingSeverity.Minor]: 2,
}

function changeKey(fix: ConsistencyFixItem, path: string): string {
  return `${fix.targetElement.type}:${fix.targetElement.id}:${path}`
}

function findingSeverity(findings: ContinuityFinding[], inconsistencyId: string): number {
  const finding = findings.find(item => item.id === inconsistencyId)
  if (!finding) return SEVERITY_RANK[ContinuityFindingSeverity.Minor]
  return SEVERITY_RANK[finding.severity]
}

/**
 * Keep one patch per target field. Highest-severity finding wins; the rest
 * are recorded as overlap skips.
 */
export function collapseFixesByFieldPath(
  fixes: ConsistencyFixItem[],
  findings: ContinuityFinding[]
): { fixes: ConsistencyFixItem[]; skipped: SkippedFinding[] } {
  const taken = new Set<string>()
  const skipped: SkippedFinding[] = []
  const rebuilt: ConsistencyFixItem[] = []

  const ranked = [...fixes].sort(
    (left, right) =>
      findingSeverity(findings, left.inconsistencyId) -
      findingSeverity(findings, right.inconsistencyId)
  )

  for (const fix of ranked) {
    const keptChanges = []
    for (const change of fix.changes) {
      const key = changeKey(fix, change.path)
      if (taken.has(key)) {
        skipped.push({
          findingId: fix.inconsistencyId,
          reason: FixInconsistenciesSkipReason.Overlap,
          detail: `Dropped overlapping patch on ${key}`,
        })
        continue
      }
      taken.add(key)
      keptChanges.push(change)
    }
    if (keptChanges.length > 0) {
      rebuilt.push({ ...fix, changes: keptChanges })
    }
  }

  return { fixes: rebuilt, skipped }
}

export function isPatchableFinding(finding: ContinuityFinding): boolean {
  return finding.patchable !== false
}

export function filterLockedFixes(
  canon: AssembledCanon,
  fixes: ConsistencyFixItem[]
): { fixes: ConsistencyFixItem[]; skipped: SkippedFinding[] } {
  const lockedBeats = new Set(canon.lockedBeatIds)
  const lockedCharacters = new Set(canon.lockedCharacterIds)
  const skipped: SkippedFinding[] = []
  const kept: ConsistencyFixItem[] = []

  for (const fix of fixes) {
    const { type, id } = fix.targetElement
    const lockedBibleField =
      canon.bibleLocked && type === ContinuityAffectedKind.WorldRule
    const lockedBeat = type === ContinuityAffectedKind.Beat && lockedBeats.has(id)
    const lockedCharacter =
      type === ContinuityAffectedKind.Character && lockedCharacters.has(id)
    if (lockedBibleField || lockedBeat || lockedCharacter) {
      skipped.push({
        findingId: fix.inconsistencyId,
        reason: FixInconsistenciesSkipReason.Locked,
        detail: `Skipped locked ${type} ${id}`,
      })
      continue
    }
    kept.push(fix)
  }

  return { fixes: kept, skipped }
}
