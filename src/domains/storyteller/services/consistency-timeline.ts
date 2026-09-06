import { scoreCausalGraph } from '@/domains/storyteller/core/prose-check/causal-graph'
import type { ConsistencyBeatSlice } from './consistency-types'
import {
  ConsistencyIssueType,
  ConsistencySeverity,
  ConsistencySuggestion,
} from '@/domains/storyteller/services/constants/consistency-issues'
import type { ContinuityIssue } from './consistency-issue-shape'

function stringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is string => typeof id === 'string' && id.length > 0)
}

export function checkTimelineFromRows(rows: ConsistencyBeatSlice[]): ContinuityIssue[] {
  const unique = rows.map(beat => ({
    id: beat.id,
    sequence: beat.sequence,
    causalDependencies: stringIds(beat.causalDependencies),
    beatType: beat.beatType,
  }))
  const score = scoreCausalGraph(unique)
  const issues: ContinuityIssue[] = []

  for (const beat of unique) {
    if (beat.sequence > 1 && beat.causalDependencies.length === 0) {
      issues.push({
        type: ConsistencyIssueType.Timeline,
        severity: ConsistencySeverity.Major,
        description: `Beat [${beat.id}] sequence ${beat.sequence} has no causal parent`,
        location: beat.id,
        affectedElements: [beat.id],
        suggestion: ConsistencySuggestion.NameCausalParent,
      })
    }
  }

  for (const flag of score.forwardFlags) {
    issues.push({
      type: ConsistencyIssueType.Timeline,
      severity: ConsistencySeverity.Critical,
      description: `Beat [${flag.beatId}] depends on later or same-sequence beat [${flag.dependencyId}]`,
      location: flag.beatId,
      affectedElements: [flag.beatId, flag.dependencyId],
      suggestion: ConsistencySuggestion.PointCausalEarlier,
    })
  }

  return issues
}
